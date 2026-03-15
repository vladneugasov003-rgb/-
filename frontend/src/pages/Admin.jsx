import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const PLANS = { trial:'Пробный', free:'Бесплатный', starter:'Старт', business:'Бизнес', pro:'Про' }
const PLAN_COLORS = { trial:'#7c6cf5', free:'var(--c-muted)', starter:'#3ecf8e', business:'#7c6cf5', pro:'#f5c542' }

export default function Admin() {
  const navigate = useNavigate()
  const [secret, setSecret] = useState(localStorage.getItem('bm_admin')||'')
  const [authed, setAuthed] = useState(false)
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async (s=secret) => {
    setLoading(true)
    try {
      const [st,us] = await Promise.all([
        fetch('/api/admin/stats',{headers:{'x-admin-secret':s}}).then(r=>r.json()),
        fetch('/api/admin/users',{headers:{'x-admin-secret':s}}).then(r=>r.json()),
      ])
      if(st.error){setAuthed(false);setLoading(false);return}
      setStats(st);setUsers(us);setAuthed(true)
    }catch(e){console.error(e)}
    setLoading(false)
  }

  const login=()=>{localStorage.setItem('bm_admin',secret);load(secret)}

  useEffect(()=>{const s=localStorage.getItem('bm_admin');if(s){setSecret(s);load(s)}},[])

  const changePlan=async(uid,plan)=>{
    await fetch(`/api/admin/users/${uid}/plan`,{method:'PUT',headers:{'Content-Type':'application/json','x-admin-secret':secret},body:JSON.stringify({plan})})
    load()
  }

  if(!authed) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--c-bg)'}}>
      <div className="card" style={{width:360,textAlign:'center'}}>
        <div style={{fontSize:36,marginBottom:16}}>🔐</div>
        <h2 style={{marginBottom:20}}>Панель администратора</h2>
        <input type="password" placeholder="Admin secret" value={secret} onChange={e=>setSecret(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>
        <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:12,padding:'10px'}} onClick={login}>Войти</button>
      </div>
    </div>
  )

  return (
    <div style={{padding:32,maxWidth:1100,background:'var(--c-bg)',minHeight:'100vh'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div><h1 style={{fontSize:22,fontWeight:600}}>Панель администратора</h1><p style={{color:'var(--c-muted)',fontSize:13}}>БотМастер</p></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-sm" onClick={()=>load()}>↺ Обновить</button>
          <button className="btn btn-sm" onClick={()=>navigate('/')}>← На сайт</button>
        </div>
      </div>

      {stats&&<div className="grid-4" style={{marginBottom:24}}>
        {[['Пользователей',stats.total_users,'👥'],['Ботов',stats.total_bots,'🤖'],['Диалогов',stats.total_conversations,'💬'],['Сообщений',stats.total_messages,'✉️']].map(([l,v,i])=>(
          <div key={l} className="metric"><div className="metric-label">{i} {l}</div><div className="metric-value">{(v||0).toLocaleString()}</div></div>
        ))}
      </div>}

      {stats?.by_plan&&<div className="card" style={{marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:14,color:'var(--c-muted)'}}>По тарифам</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {Object.entries(stats.by_plan).map(([plan,count])=>(
            <div key={plan} style={{background:'var(--c-surface2)',borderRadius:8,padding:'10px 16px',textAlign:'center',minWidth:80}}>
              <div style={{fontSize:22,fontWeight:700,color:PLAN_COLORS[plan]||'var(--c-text)'}}>{count}</div>
              <div style={{fontSize:12,color:'var(--c-muted)'}}>{PLANS[plan]||plan}</div>
            </div>
          ))}
        </div>
      </div>}

      <div className="card">
        <div style={{fontSize:13,fontWeight:500,marginBottom:16,color:'var(--c-muted)'}}>Пользователи ({users.length})</div>
        {loading?<div className="spinner"/>:
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {users.map(u=>(
            <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'var(--c-surface2)',borderRadius:8}}>
              <div style={{width:34,height:34,borderRadius:'50%',background:'var(--c-purple-dim)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:600,color:'var(--c-purple)',flexShrink:0}}>{u.name?.[0]?.toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500}}>{u.name}</div>
                <div style={{fontSize:12,color:'var(--c-muted)'}}>{u.email} · {u.bot_count} ботов · {new Date(u.created_at).toLocaleDateString('ru')}</div>
              </div>
              <select value={u.plan} onChange={e=>changePlan(u.id,e.target.value)} style={{width:'auto',padding:'4px 8px',fontSize:12}}>
                {Object.entries(PLANS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>}
      </div>
    </div>
  )
}
