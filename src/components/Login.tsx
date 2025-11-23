import { createSignal, type Component } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

interface LoginProps {
  onLogin: (user: { username: string; role: string }) => void;
}

const Login: Component<LoginProps> = (props) => {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");

  async function handleLogin(e: Event) {
    e.preventDefault();
    try {
      const res = await invoke<any>("login_user", { 
        creds: { username: username(), password: password() } 
      });
      
      if (res.success) {
        props.onLogin({ username: res.username, role: res.role });
      }
    } catch (err) {
      setError("Invalid username or password");
    }
  }

  return (
    <div class="login-container">
      <div class="login-box">
        <h2>Blisstech Secure Login</h2>
        <form onSubmit={handleLogin}>
          <input 
            placeholder="Username" 
            value={username()} 
            onInput={(e) => setUsername(e.currentTarget.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password()} 
            onInput={(e) => setPassword(e.currentTarget.value)} 
          />
          <button type="submit" class="btn-primary" style="width: 100%">Login</button>
        </form>
        <p class="error-text">{error()}</p>
      </div>
    </div>
  );
};

export default Login;