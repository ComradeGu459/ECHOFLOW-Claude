"use client";

import { useEffect, useState } from "react";

export default function MaterialPreview({ material }) {
  const [localUrl, setLocalUrl] = useState("");

  useEffect(() => {
    if (material.sourceMediaKind !== "local-video" || !material.localVideoBlob) {
      setLocalUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(material.localVideoBlob);
    setLocalUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [material.localVideoBlob, material.sourceMediaKind]);

  if (material.thumbnailUrl) {
    return (
      <div
        className="material-preview-frame"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.44)), url(${material.thumbnailUrl})` }}
      />
    );
  }

  if (localUrl) {
    return (
      <video
        className="material-preview-video"
        muted
        playsInline
        preload="metadata"
        src={localUrl}
      />
    );
  }

  return (
    <div className="material-preview-placeholder">
      <strong>{material.sourceMediaKind === "local-video" ? "本地视频" : "视频素材"}</strong>
      <p>{material.localVideoFileName || material.videoId || "等待预览"}</p>
    </div>
  );
}
