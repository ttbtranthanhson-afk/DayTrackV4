import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { setAvatar, useAvatar } from '../hooks/avatarStore';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const OUTPUT_SIZE = 320;

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc file ảnh này.'));
    };
    image.src = url;
  });
}

async function fileToAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Vui lòng chọn một file ảnh.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Ảnh quá lớn. Vui lòng chọn ảnh dưới 8MB.');
  }

  const image = await readImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');

  const scale = Math.max(OUTPUT_SIZE / image.width, OUTPUT_SIZE / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(
    image,
    (OUTPUT_SIZE - width) / 2,
    (OUTPUT_SIZE - height) / 2,
    width,
    height,
  );

  return canvas.toDataURL('image/jpeg', 0.86);
}

interface UserAvatarProps {
  name: string;
  className: string;
  textClassName?: string;
  editable?: boolean;
  buttonClassName?: string;
}

export function UserAvatar({
  name,
  className,
  textClassName = '',
  editable = false,
  buttonClassName = '',
}: UserAvatarProps) {
  const avatar = useAvatar();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const initials = initialsFromName(name) || 'DT';

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const dataUrl = await fileToAvatar(file);
      setAvatar(dataUrl);
      toast.success('Đã cập nhật ảnh đại diện');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật ảnh đại diện.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className="w-full h-full rounded-[inherit] overflow-hidden flex items-center justify-center">
        {avatar ? (
          <img src={avatar} alt={name || 'Ảnh đại diện'} className="w-full h-full object-cover" />
        ) : (
          <span className={textClassName}>{initials}</span>
        )}
      </div>

      {busy && (
        <div className="absolute inset-0 rounded-[inherit] bg-black/40 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}

      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Đổi ảnh đại diện"
            aria-label="Đổi ảnh đại diện"
            className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-900 text-white border-2 border-white shadow-sm flex items-center justify-center hover:bg-gray-700 transition-colors ${buttonClassName}`}
          >
            <Camera className="w-3 h-3" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleFile}
          />
        </>
      )}
    </div>
  );
}
