/** Pick a MediaRecorder mime type supported by the current browser (Safari needs mp4). */

export type RecorderFormat = {
  mimeType: string;
  blobType: string;
  ext: string;
};

const RECORDER_CANDIDATES: RecorderFormat[] = [
  { mimeType: "audio/webm;codecs=opus", blobType: "audio/webm", ext: "webm" },
  { mimeType: "audio/webm", blobType: "audio/webm", ext: "webm" },
  { mimeType: "audio/mp4", blobType: "audio/mp4", ext: "mp4" },
  { mimeType: "audio/aac", blobType: "audio/aac", ext: "aac" },
];

export function pickRecorderFormat(): RecorderFormat {
  if (typeof MediaRecorder !== "undefined") {
    for (const candidate of RECORDER_CANDIDATES) {
      if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
        return candidate;
      }
    }
  }
  return RECORDER_CANDIDATES[1];
}

export function createMediaRecorder(stream: MediaStream): MediaRecorder {
  const format = pickRecorderFormat();
  if (format.mimeType) {
    return new MediaRecorder(stream, { mimeType: format.mimeType });
  }
  return new MediaRecorder(stream);
}
