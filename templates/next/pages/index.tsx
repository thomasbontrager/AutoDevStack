import type { NextPage } from 'next';
import Head from 'next/head';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>My Next.js App</title>
        <meta name="description" content="Created with AutoDevStack" />
      </Head>
      <main style={{ textAlign: 'center', padding: '4rem' }}>
        <h1>Welcome to Next.js 🚀</h1>
        <p>Scaffolded by AutoDevStack</p>
      </main>
    </>
  );
};

export default Home;
