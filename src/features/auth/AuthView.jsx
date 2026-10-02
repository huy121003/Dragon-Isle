import React,{useState} from 'react';
import {Button,Card,Form,Input,Typography} from 'antd';

export default function AuthView(){
  const [mode,setMode]=useState('login'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(values){
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'same-origin',body:JSON.stringify(values)});
      const body=await response.json();if(!response.ok)throw Error(body.error||'Unable to sign in.');
      window.location.reload();
    }catch(e){setError(e.message);setBusy(false);}
  }
  return <div className="react-auth"><Card className="login-card">
    <div className="login-crest">🐉</div><Typography.Title level={2}>Dragon Isle</Typography.Title>
    <Typography.Text type="secondary">Your own dragon island</Typography.Text>
    <div className="auth-switch">
      <Button type={mode==='login'?'primary':'default'} onClick={()=>{setMode('login');setError('');}}>Sign in</Button>
      <Button type={mode==='register'?'primary':'default'} onClick={()=>{setMode('register');setError('');}}>Register</Button>
    </div>
    <Form layout="vertical" onFinish={submit} autoComplete="on">
      <Form.Item name="username" label="Username" rules={[{required:true,message:'Enter your username'},
        {pattern:/^[A-Za-z0-9_]{3,24}$/,message:'3–24 letters, numbers or underscores'}]}>
        <Input size="large" autoComplete="username"/></Form.Item>
      <Form.Item name="password" label="Password" rules={[{required:true,message:'Enter your password'},
        {min:8,message:'At least 8 characters'}]}>
        <Input.Password size="large" autoComplete={mode==='login'?'current-password':'new-password'}/></Form.Item>
      {error&&<Typography.Text type="danger">{error}</Typography.Text>}
      <Button size="large" type="primary" htmlType="submit" loading={busy} block>
        {mode==='login'?'Enter island':'Create account'}
      </Button>
    </Form>
  </Card></div>;
}
