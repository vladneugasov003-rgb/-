import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { botsAPI } from '../api/index.js'

const NICHES = [
  {id:'Beauty & SPA',icon:'💅',label:'Салон красоты'},
  {id:'Медицина',icon:'🏥',label:'Медклиника'},
  {id:'Автосервис',icon:'🔧',label:'Автосервис'},
  {id:'Юридия',icon:'⚖️',label:'Юридия'},
  {id:'Доставка еды',icon:'🍕',label:'Доставка'},
  {id:'Интернет-магазин',icon:'🛍️',label:'Магазин'},
  {id:'Другое',icon:'🤖',label:'Другое'},
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({niche:'',name:'',description:'',greeting:'Привет! Я помощник. Чем могу помочь?'})
  const [loading, setLoading] = useState(false)
  const [botId, setBotId] = useState(null)
  const [error, setError] = useState('')
  const set=(k,v)=>setForm(f=>({...f,[k]:v}))

  const createBot=async()=>{
    setLoading(true);setError('')
    try{const bot=await botsAPI.create(form);setBotId(bot.id);setStep(3)}
    catch(e){setError(e.message)}
    finally{setLoading(false)}
  }

  const progress=(step/(3))*100

  return (
    <div style={{minHeight:'100vh',background:'var(--c-bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:520}}>
        <div style={{marginBottom:28}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            {['Ниша','Описание','Приветствие','Готово!'].map((s,i)=>(
              <div key={s} style={{fontSize:12,color:i<=step?'var(--c-purple)':'var(--c-hint)',fontWeight:i===step?500:400}}>{i<step?'✓':i+1}. {s}</div>
            ))}
          </div>
          <div style={{height:3,background:'var(--c-border)',borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',width:progress+'%',background:'var(--c-purple)',borderRadius:2,transition:'width .4s'}}/>
          </div>
        </div>

        {step===0&&<div className="card">
          <h2 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Ваша сфера бизнеса?</h2>
          <p style={{color:'var(--c-muted)',fontSize:14,marginBottom:20}}>Бот будет говорить правильным языком для вашей ниши</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,marginBottom:20}}>
            {NICHES.map(n=>(
              <div key={n.id} onClick={()=>set('niche',n.id)} style={{border:`1px solid ${form.niche===n.id?'var(--c-purple)':'var(--c-border)'}`,background:form.niche===n.id?'var(--c-purple-dim)':'var(--c-surface2)',borderRadius:10,padding:'14px 10px',textAlign:'center',cursor:'pointer',transition:'all .15s'}}>
                <div style={{fontSize:26,marginBottom:6}}>{n.icon}</div>
                <div style={{fontSize:12,fontWeight:500}}>{n.label}</div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'11px'}} disabled={!form.niche} onClick={()=>setStep(1)}>Далее →</button>
        </div>}

        {step===1&&<div className="card">
          <h2 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Расскажите о бизнесе</h2>
          <p style={{color:'var(--c-muted)',fontSize:14,marginBottom:20}}>Чем подробнее — тем умнее бот</p>
          <div className="field-label">Название</div>
          <input type="text" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Салон «Гармония»"/>
          <div className="field-label">Описание (адрес, режим работы, услуги, цены)</div>
          <textarea rows={5} value={form.description} onChange={e=>set('description',e.target.value)} placeholder="Пример: Салон красоты, ул. Ленина 45. Стрижки от 800₽, маникюр от 1500₽. Работаем 9-21."/>
          <div style={{display:'flex',gap:8,marginTop:20}}>
            <button className="btn" onClick={()=>setStep(0)}>← Назад</button>
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} disabled={!form.name||!form.description} onClick={()=>setStep(2)}>Далее →</button>
          </div>
        </div>}

        {step===2&&<div className="card">
          <h2 style={{fontSize:20,fontWeight:600,marginBottom:8}}>Приветствие бота</h2>
          <textarea rows={3} value={form.greeting} onChange={e=>set('greeting',e.target.value)}/>
          <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
            {['Привет! 👋 Чем могу помочь?','Добрый день! Задайте ваш вопрос.','Здравствуйте! Рады вас видеть!'].map(t=>(
              <button key={t} className="btn btn-sm" style={{fontSize:11}} onClick={()=>set('greeting',t)}>{t}</button>
            ))}
          </div>
          {error&&<div style={{marginTop:12,padding:'8px 12px',background:'var(--c-red-dim)',color:'var(--c-red)',borderRadius:6,fontSize:13}}>{error}</div>}
          <div style={{display:'flex',gap:8,marginTop:20}}>
            <button className="btn" onClick={()=>setStep(1)}>← Назад</button>
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center',padding:'11px'}} disabled={loading} onClick={createBot}>
              {loading?<span className="spinner" style={{width:16,height:16}}/>:'🚀 Создать бота'}
            </button>
          </div>
        </div>}

        {step===3&&<div className="card" style={{textAlign:'center',padding:40}}>
          <div style={{fontSize:56,marginBottom:16}}>🎉</div>
          <h2 style={{fontSize:24,fontWeight:600,marginBottom:12}}>Бот создан!</h2>
          <p style={{color:'var(--c-muted)',fontSize:15,marginBottom:32,lineHeight:1.7}}>Протестируйте его — напишите как клиент</p>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <button className="btn btn-primary" style={{justifyContent:'center',padding:'12px'}} onClick={()=>navigate(`/bots/${botId}/chat`)}>💬 Протестировать</button>
            <button className="btn" style={{justifyContent:'center'}} onClick={()=>navigate(`/bots/${botId}/edit`)}>⚙️ Настроить подробнее</button>
            <button className="btn" style={{justifyContent:'center'}} onClick={()=>navigate('/dashboard')}>На дашборд</button>
          </div>
        </div>}
      </div>
    </div>
  )
}
