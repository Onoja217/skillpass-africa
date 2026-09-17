"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

type VerificationQRCodeProps = {
  verificationId: string;
};

export default function VerificationQRCode({
  verificationId,
}: VerificationQRCodeProps) {
  const [qrCode, setQrCode] = useState<string>("");

  useEffect(() => {
    const verificationUrl = `${window.location.origin}/verify/${verificationId}`;

    QRCode.toDataURL(verificationUrl, {
      width: 240,
      margin: 2,
    })
      .then(setQrCode)
      .catch(() => setQrCode(""));
  }, [verificationId]);

  if (!qrCode) {
    return (
      <div className="flex h-60 w-60 items-center justify-center rounded-lg border bg-muted">
        <p className="text-sm text-muted-foreground">
          Generating QR code...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Image
        src={qrCode}
        alt={`QR code for verification ${verificationId}`}
        width={240}
        height={240}
        unoptimized
        className="h-60 w-60 rounded-lg border bg-white p-2"
      />

      <p className="text-center text-xs text-muted-foreground">
        Scan this QR code to verify this skill.
      </p>
    </div>
  );
}
