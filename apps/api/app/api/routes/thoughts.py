from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.models import ExpressionAsset, Thought, ThoughtVersion
from app.schemas import ThoughtDetailRead, ThoughtRead, ThoughtVersionDiffRead, ThoughtVersionRead

router = APIRouter(prefix="/thoughts", tags=["thoughts"])


@router.get("", response_model=list[ThoughtRead])
def list_thoughts(current_user: CurrentUser, db: DBSession) -> list[Thought]:
    return list(
        db.scalars(
            select(Thought)
            .where(Thought.user_id == current_user.id)
            .order_by(Thought.frozen_at.desc(), Thought.created_at.desc())
        )
    )


@router.get("/{thought_id}", response_model=ThoughtDetailRead)
def get_thought(thought_id: str, current_user: CurrentUser, db: DBSession) -> ThoughtDetailRead:
    thought = _get_thought(thought_id, current_user.id, db)
    asset = db.scalar(
        select(ExpressionAsset).where(
            ExpressionAsset.thought_id == thought.id,
            ExpressionAsset.user_id == current_user.id,
        )
    )
    return ThoughtDetailRead(
        **ThoughtRead.model_validate(thought).model_dump(),
        expression_asset_id=asset.id if asset else None,
        variants=asset.variants if asset else {},
    )


@router.get("/{thought_id}/versions", response_model=list[ThoughtVersionRead])
def list_thought_versions(
    thought_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> list[ThoughtVersion]:
    thought = _get_thought(thought_id, current_user.id, db)
    versions = list(
        db.scalars(
            select(ThoughtVersion)
            .where(ThoughtVersion.thought_id == thought.id)
            .order_by(ThoughtVersion.version.desc())
        )
    )
    if not versions:
        return [
            ThoughtVersion(
                id=f"current-{thought.id}",
                thought_id=thought.id,
                version=thought.version,
                title=thought.title,
                summary=thought.summary,
                final_content_native=thought.final_content_native,
                final_content_target=thought.final_content_target,
                freeze_payload=thought.freeze_payload,
                mind_graph=thought.mind_graph,
                created_at=thought.frozen_at or thought.created_at,
            )
        ]
    return versions


@router.get("/{thought_id}/versions/diff", response_model=ThoughtVersionDiffRead)
def diff_thought_versions(
    thought_id: str,
    current_user: CurrentUser,
    db: DBSession,
    version_a: int = Query(..., ge=1),
    version_b: int = Query(..., ge=1),
) -> ThoughtVersionDiffRead:
    thought = _get_thought(thought_id, current_user.id, db)
    versions = {
        row.version: row
        for row in db.scalars(
            select(ThoughtVersion).where(ThoughtVersion.thought_id == thought.id)
        )
    }
    if thought.version not in versions:
        versions[thought.version] = ThoughtVersion(
            id=f"current-{thought.id}",
            thought_id=thought.id,
            version=thought.version,
            title=thought.title,
            summary=thought.summary,
            final_content_native=thought.final_content_native,
            final_content_target=thought.final_content_target,
            freeze_payload=thought.freeze_payload,
            mind_graph=thought.mind_graph,
        )

    left = versions.get(version_a)
    right = versions.get(version_b)
    if not left or not right:
        raise HTTPException(status_code=404, detail="Thought version not found")

    left_keys = set(left.freeze_payload.get("expression_versions", {}).keys())
    right_keys = set(right.freeze_payload.get("expression_versions", {}).keys())
    added = sorted(right_keys - left_keys)
    removed = sorted(left_keys - right_keys)
    changed = sorted(
        key
        for key in left_keys & right_keys
        if left.freeze_payload.get("expression_versions", {}).get(key)
        != right.freeze_payload.get("expression_versions", {}).get(key)
    )
    return ThoughtVersionDiffRead(
        version_a=version_a,
        version_b=version_b,
        added=added,
        removed=removed,
        changed=changed,
    )


def _get_thought(thought_id: str, user_id: str, db: DBSession) -> Thought:
    thought = db.scalar(
        select(Thought).where(Thought.id == thought_id, Thought.user_id == user_id)
    )
    if not thought:
        raise HTTPException(status_code=404, detail="Thought not found")
    return thought


@router.get("/{thought_id}/mind-graph")
def get_mind_graph(
    thought_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    thought = _get_thought(thought_id, current_user.id, db)
    graph = thought.mind_graph or {}
    if not graph.get("nodes") and thought.freeze_payload:
        freeze = thought.freeze_payload
        nodes = []
        edges = []
        node_id = 0

        def _make_node(label: str, ntype: str) -> str:
            nonlocal node_id
            nid = str(node_id)
            node_id += 1
            nodes.append({"id": nid, "label": label[:30], "type": ntype})
            return nid

        root = _make_node(thought.title or "主题", "topic")
        for kw in (freeze.get("keywords") or [])[:5]:
            child = _make_node(kw, "value")
            edges.append({"from": root, "to": child})
        for pat in (freeze.get("core_patterns") or [])[:3]:
            child = _make_node(pat, "argument")
            edges.append({"from": root, "to": child})
        graph = {"nodes": nodes, "edges": edges}

    return graph


@router.post("/{thought_id}/convert-to-topic")
def convert_thought_to_topic(
    thought_id: str,
    current_user: CurrentUser,
    db: DBSession,
) -> dict:
    from app.models import Topic, utc_now
    thought = _get_thought(thought_id, current_user.id, db)
    freeze = thought.freeze_payload or {}
    title = thought.title or "未命名思想"
    background = freeze.get("golden_quote", "") or thought.summary or ""
    keywords = freeze.get("keywords", [])
    pro_view = freeze.get("arguments", ["同意"])[0] if freeze.get("arguments") else ""
    con_view = freeze.get("values", ["反对"])[0] if freeze.get("values") else ""

    topic = Topic(
        title=title,
        creator_id=current_user.id,
        thought_id=thought.id,
        category="converted",
        background=background,
        tags=keywords[:5],
        pro_view=pro_view,
        con_view=con_view,
        status="published",
        language="zh",
        heat="0",
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return {"id": topic.id, "title": topic.title, "message": "思想已转换为公开话题"}


@router.get("/{thought_id}/export")
def export_thought(
    thought_id: str,
    current_user: CurrentUser,
    db: DBSession,
    format: str = Query("md", description="Export format: md, pdf, docx"),
) -> Response:
    from fastapi.responses import Response
    thought = _get_thought(thought_id, current_user.id, db)
    title = thought.title or "未命名"
    content_native = thought.final_content_native or ""
    content_target = thought.final_content_target or ""
    freeze = thought.freeze_payload or {}
    keywords = freeze.get("keywords", [])
    patterns = freeze.get("core_patterns", [])

    if format == "pdf":
        from app.services.export_service import export_to_pdf
        pdf_bytes = export_to_pdf(title, content_native, content_target, keywords, patterns)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{title}.pdf"'},
        )
    elif format == "docx":
        from app.services.export_service import export_to_docx
        docx_bytes = export_to_docx(title, content_native, content_target, keywords, patterns)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{title}.docx"'},
        )
    elif format == "text":
        lines = [title, "", content_native, "", content_target]
        if keywords:
            lines += ["", "Keywords:", *[f"  {kw}" for kw in keywords]]
        if patterns:
            lines += ["", "Core Patterns:", *[f"  {p}" for p in patterns]]
        txt = "\n".join(lines)
        return Response(
            content=txt,
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{title}.txt"'},
        )
    else:
        md = f"# {title}\n\n## 中文原文\n\n{content_native}\n\n## English\n\n{content_target}\n\n"
        if keywords:
            md += "## Keywords\n\n"
            for kw in keywords:
                md += f"- {kw}\n"
        if patterns:
            md += "## Core Patterns\n\n"
            for p in patterns:
                md += f"- {p}\n"
        return Response(
            content=md,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{title}.md"'},
        )
