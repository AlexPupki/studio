import Link from 'next/link';

export default function LauncherPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Добро пожаловать</h1>
        <div className="space-x-4">
          <Link href="/web" passHref>
            <button className="px-8 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-colors">
              WEB
            </button>
          </Link>
          <Link href="/cms" passHref>
            <button className="px-8 py-3 text-lg font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition-colors">
              CMS
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}