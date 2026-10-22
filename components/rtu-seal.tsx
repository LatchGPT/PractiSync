import Image from 'next/image';

export function RtuSeal({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/rtu-seal.png"
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`rtu-seal-image ${className}`.trim()}
    />
  );
}
