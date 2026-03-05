import type { NextPage } from 'next';
import Head from 'next/head';
import { trpc } from '@/utils/trpc';

const Home: NextPage = () => {
  const hello = trpc.example.hello.useQuery({ name: 'T3' });

  return (
    <>
      <Head>
        <title>My T3 App</title>
        <meta name="description" content="Created with AutoDevStack" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to the T3 Stack 🚀
          </h1>
          <p className="text-lg text-gray-600 mb-2">Scaffolded by AutoDevStack</p>
          {hello.data ? (
            <p className="text-blue-600 font-medium">{hello.data.greeting}</p>
          ) : (
            <p className="text-gray-400">Loading...</p>
          )}
        </div>
      </main>
    </>
  );
};

export default Home;
