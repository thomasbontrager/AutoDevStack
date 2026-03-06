export default function AdminHome() {
  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
      <h1>Admin Dashboard</h1>
      <p>This is the admin application in your monorepo.</p>
      <nav style={{ marginTop: '20px' }}>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><a href="/admin/users">Users</a></li>
          <li><a href="/admin/settings">Settings</a></li>
        </ul>
      </nav>
    </div>
  )
}
