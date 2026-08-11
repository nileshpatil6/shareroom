import { Metadata } from 'next';
import { RoomView } from '@/components/RoomView';

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Room #${code} - ShareRoom`,
    description: `Join room #${code} on ShareRoom to exchange code snippets, text notes, and files (up to 10MB) with auto-erasure.`,
  };
}

export default async function RoomPage({ params }: PageProps) {
  const { code } = await params;
  return <RoomView roomCode={code} />;
}
