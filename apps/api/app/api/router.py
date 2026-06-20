from fastapi import APIRouter

from app.api.routes import (
    admin,
    admin_data,
    admin_match,
    assets,
    auth,
    circles,
    config,
    conversations,
    gamification,
    games,
    grammar,
    matching,
    party_room,
    privacy,
    profile,
    reports,
    social_logic,
    thoughts,
    topics,
    vocabulary,
    voice,
    werewolf_room,
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(config.router)
api_router.include_router(profile.router)
api_router.include_router(conversations.router)
api_router.include_router(assets.router)
api_router.include_router(grammar.router)
api_router.include_router(vocabulary.router)
api_router.include_router(voice.router)
api_router.include_router(admin.router)
api_router.include_router(admin_data.router)
api_router.include_router(admin_match.router, prefix="/admin/match-radar", tags=["admin-match-radar"])
api_router.include_router(topics.router)
api_router.include_router(thoughts.router)
api_router.include_router(circles.router)
api_router.include_router(matching.router)
api_router.include_router(privacy.router)
api_router.include_router(reports.router)
api_router.include_router(gamification.router)
api_router.include_router(games.router)
api_router.include_router(social_logic.router)
api_router.include_router(party_room.router)
api_router.include_router(werewolf_room.router)
