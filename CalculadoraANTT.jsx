import { useState } from "react";
import {
  Truck, MapPin, Package, Calculator, CheckCircle2,
  XCircle, Clock, ChevronDown, ChevronUp, Plus,
  ArrowRight, AlertTriangle, ShieldCheck, FileText,
  BarChart3, User, Settings, Search, Loader2
} from "lucide-react";

const VEI = {
  VUC:          { l: "VUC (até 3,5t)",         r: 1.4258, m: 158.19 },
  "3/4":        { l: "3/4 (até 6t)",            r: 1.4912, m: 165.45 },
  Toco:         { l: "Toco (até 14t)",          r: 2.1274, m: 236.38 },
  Truck:        { l: "Truck (até 23t)",         r: 2.4851, m: 275.89 },
  Carreta:      { l: "Carreta (até 33t)",       r: 3.0567, m: 339.41 },
  "Carreta LS": { l: "Carreta LS (até 41,5t)",  r: 3.4068, m: 378.46 },
  "Bi-trem":    { l: "Bi-trem (até 45t)",       r: 3.8534, m: 427.97 },
};

const CAT = {
  Geral: 1.00, Frigorificada: 1.15,
  "Granel Sólido": 0.95, "Granel Líquido": 1.00,
  Neogranel: 1.00, Perigosa: 1.30,
};

const EMBALAGENS = [
  "Palete","Granel","Tambor","Milheiro","Caixa",
  "Saco / Big Bag","IBC / Contentor","Fardo","Bobina",
  "Peça Solta","Container","Outro",
];

const UNITIZACOES = [
  { value:"paletizada",    label:"Paletizada",      desc:"Carga sobre paletes, empilhável" },
  { value:"granel",        label:"A Granel",         desc:"Sem embalagem unitizada" },
  { value:"lote",          label:"Por Lote",         desc:"Agrupada em lotes identificados" },
  { value:"tambor",        label:"Em Tambor / IBC",  desc:"Líquidos ou sólidos em tambores" },
  { value:"milheiro",      label:"Milheiro",         desc:"Contagem unitária em mil peças" },
  { value:"nao_unitizada", label:"Não Unitizada",    desc:"Carga solta, sem padrão" },
];

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const fmt    = (v) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const fmtCep = (v) => v.replace(/\D/g,"").slice(0,8).replace(/^(\d{5})(\d)/,"$1-$2");
const calcMin = (vei,dist,cat) => {
  const v = VEI[vei];
  if(!v||!dist||Number(dist)<=0) return 0;
  return Math.round(Math.max(v.m, v.r*Number(dist))*(CAT[cat]||1)*100)/100;
};

const S = {
  card:  {background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"18px 20px"},
  input: {width:"100%",padding:"8px 12px",fontSize:14,border:"1px solid #d1d5db",borderRadius:8,background:"#fff",color:"#111",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  label: {display:"block",fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"},
  sec:   {fontSize:11,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14,display:"flex",alignItems:"center",gap:6},
  btn:   {padding:"9px 18px",fontSize:14,fontWeight:600,borderRadius:8,cursor:"pointer",border:"none",display:"inline-flex",alignItems:"center",gap:6},
};

function Badge({status}){
  const m={Aguardando:{bg:"#fef3c7",c:"#92400e",I:Clock},Aprovada:{bg:"#d1fae5",c:"#065f46",I:CheckCircle2},Reprovada:{bg:"#fee2e2",c:"#991b1b",I:XCircle}};
  const {bg,c,I}=m[status]||m.Aguardando;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:bg,color:c}}><I size={12}/>{status}</span>;
}

function Field({label,hint,hintColor,children}){
  return <div><label style={S.label}>{label}</label>{children}{hint&&<p style={{fontSize:11,color:hintColor||"#9ca3af",marginTop:4}}>{hint}</p>}</div>;
}

function CepBlock({prefix,uf,setUf,cidade,setCidade,bairro,setBairro,cep,setCep}){
  const [loading,setLoading]=useState(false);
  const [cepErr,setCepErr]=useState("");
  const buscar=async(raw)=>{
    const n=raw.replace(/\D/g,"");
    if(n.length<8) return;
    setLoading(true);setCepErr("");
    try{
      const r=await fetch(`https://viacep.com.br/ws/${n}/json/`);
      const d=await r.json();
      if(d.erro) setCepErr("CEP não encontrado.");
      else{ setUf(d.uf||""); setCidade((d.localidade||"").toUpperCase()); setBairro((d.bairro||"").toUpperCase()); }
    }catch{ setCepErr("Erro ao consultar o CEP."); }
    finally{ setLoading(false); }
  };
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Field label={prefix==="ori"?"CEP Origem":"CEP Destino"} hint={cepErr} hintColor="#dc2626">
        <div style={{display:"flex",gap:6}}>
          <input style={{...S.input,flex:1}} value={cep} maxLength={9} placeholder="00000-000"
            onChange={e=>{const v=fmtCep(e.target.value);setCep(v);if(v.replace(/\D/g,"").length===8)buscar(v);}}/>
          <button onClick={()=>buscar(cep)} style={{...S.btn,padding:"8px 12px",background:"#f3f4f6",color:"#374151",border:"1px solid #d1d5db"}}>
            {loading?<Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/>:<Search size={14}/>}
          </button>
        </div>
      </Field>
      <div style={{display:"grid",gridTemplateColumns:"80px 1fr",gap:8}}>
        <Field label="UF"><select style={S.input} value={uf} onChange={e=>setUf(e.target.value)}><option value="">--</option>{UFS.map(u=><option key={u}>{u}</option>)}</select></Field>
        <Field label="Cidade"><input style={S.input} value={cidade} onChange={e=>setCidade(e.target.value.toUpperCase())} placeholder="Ex: MAUÁ"/></Field>
      </div>
      <Field label="Bairro / Distrito"><input style={S.input} value={bairro} onChange={e=>setBairro(e.target.value.toUpperCase())} placeholder="Preenchido via CEP ou manual"/></Field>
    </div>
  );
}

function QuoteCard({q,isAdmin,onApprove,onReject}){
  const [open,setOpen]=useState(false);
  const [comment,setComment]=useState("");
  const sug=Number(String(q.valorSugerido).replace(",","."));
  const margin=sug>0&&q.anttMin>0?(((sug-q.anttMin)/q.anttMin)*100).toFixed(1):null;
  const unitLabel=UNITIZACOES.find(u=>u.value===q.unitizacao)?.label||q.unitizacao||"—";
  return(
    <div style={{border:"1px solid #e5e7eb",borderRadius:10,marginBottom:8,overflow:"hidden",background:"#fff"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:8,background:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Truck size={16} color="#6b7280"/></div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
            <span style={{fontSize:14,fontWeight:600,color:"#111"}}>{q.ufOri}/{q.cidOri}</span>
            <ArrowRight size={13} color="#9ca3af"/>
            <span style={{fontSize:14,fontWeight:600,color:"#111"}}>{q.ufDes}/{q.cidDes}</span>
            <Badge status={q.status}/>
          </div>
          <div style={{fontSize:12,color:"#6b7280",display:"flex",gap:12,flexWrap:"wrap"}}>
            <span>{q.produto||"—"}</span>
            <span>{q.embalagem||"—"} · {unitLabel}</span>
            <span>Piso ANTT: {fmt(q.anttMin)}</span>
            <span style={{fontWeight:600,color:"#374151"}}>Cotado: {fmt(sug)}</span>
            {margin&&<span style={{color:"#10b981"}}>+{margin}% acima</span>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,color:"#9ca3af",fontSize:11,flexShrink:0}}>
          <span>{q.createdAt}</span>
          {open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
        </div>
      </div>
      {open&&(
        <div style={{borderTop:"1px solid #f3f4f6",background:"#f9fafb",padding:"14px 16px",display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Rota</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 20px",fontSize:12}}>
              {[["Origem",`${q.cepOri?q.cepOri+" · ":""}${q.ufOri}/${q.cidOri}${q.bairroOri?" — "+q.bairroOri:""}`],
                ["Destino",`${q.cepDes?q.cepDes+" · ":""}${q.ufDes}/${q.cidDes}${q.bairroDes?" — "+q.bairroDes:""}`],
                ["Distância",`${q.distancia} km`],["Veículo",VEI[q.veiculo]?.l||q.veiculo]
              ].map(([l,v])=><div key={l}><span style={{color:"#9ca3af"}}>{l}: </span><span style={{fontWeight:600,color:"#374151"}}>{v}</span></div>)}
            </div>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Carga</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px 16px",fontSize:12}}>
              {[["Produto",q.produto||"—"],["Embalagem",q.embalagem||"—"],["Unitização",unitLabel],["Categoria",q.categoria],
                ["Peso",q.peso?`${q.peso} kg`:"—"],["Volumes",q.vol||"—"],["Cubagem",q.cubagem?`${q.cubagem} m³`:"—"],["Valor NF",q.valorNF?`R$ ${q.valorNF}`:"—"]
              ].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:2}}>{l}</div>
                  <div style={{fontWeight:600,color:"#374151"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 14px",fontSize:12,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
            <div><span style={{color:"#6b7280"}}>Piso ANTT: </span><span style={{fontWeight:700,color:"#166534"}}>{fmt(q.anttMin)}</span></div>
            <div><span style={{color:"#6b7280"}}>Cotado: </span><span style={{fontWeight:700,color:"#166534"}}>{fmt(sug)}</span></div>
            {margin&&<div style={{color:"#15803d",fontWeight:700}}>+{margin}% acima do piso mínimo</div>}
          </div>
          {q.adminComment&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#92400e"}}><strong>Admin:</strong> {q.adminComment}</div>}
          {isAdmin&&q.status==="Aguardando"&&(
            <div style={{borderTop:"1px solid #e5e7eb",paddingTop:12,display:"flex",flexDirection:"column",gap:8}}>
              <textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Comentário para o cotador (opcional)" style={{...S.input,resize:"vertical",minHeight:56}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{onApprove(q.id,comment);setOpen(false);}} style={{...S.btn,flex:1,justifyContent:"center",background:"#d1fae5",color:"#065f46"}}><CheckCircle2 size={15}/>Aprovar</button>
                <button onClick={()=>{onReject(q.id,comment);setOpen(false);}} style={{...S.btn,flex:1,justifyContent:"center",background:"#fee2e2",color:"#991b1b"}}><XCircle size={15}/>Reprovar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

let _nextId=3;
function UserView({quotes,addQuote}){
  const empty={cepOri:"",ufOri:"SP",cidOri:"",bairroOri:"",cepDes:"",ufDes:"",cidDes:"",bairroDes:"",produto:"",embalagem:"Palete",unitizacao:"paletizada",peso:"",vol:"",cubagem:"",valorNF:"",veiculo:"Toco",categoria:"Geral",distancia:"",valorSugerido:""};
  const [f,setF]=useState(empty);
  const [err,setErr]=useState("");
  const [tab,setTab]=useState("form");
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const min=calcMin(f.veiculo,f.distancia,f.categoria);
  const sug=Number(String(f.valorSugerido).replace(",","."));
  const below=f.valorSugerido&&sug>0&&sug<min;
  const usedFloor=min>0&&Number(f.distancia)>0&&VEI[f.veiculo]?.r*Number(f.distancia)<VEI[f.veiculo]?.m;

  const submit=()=>{
    if(!f.cidOri.trim()||!f.ufDes||!f.cidDes.trim()){setErr("Preencha origem e destino completos.");return;}
    if(!f.distancia||Number(f.distancia)<=0){setErr("Informe a distância rodoviária em km.");return;}
    if(!f.valorSugerido){setErr("Informe o valor sugerido do frete.");return;}
    if(below){setErr(`Valor abaixo do piso ANTT (${fmt(min)}). Ajuste o valor.`);return;}
    setErr("");
    addQuote({...f,anttMin:min,id:_nextId++,status:"Aguardando",createdAt:new Date().toLocaleString("pt-BR"),adminComment:""});
    setF(empty);setTab("quotes");
  };

  return(
    <div>
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #e5e7eb"}}>
        {[["form",Plus,"Nova Cotação"],["quotes",FileText,`Minhas Cotações (${quotes.length})`]].map(([k,Icon,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",fontSize:13,fontWeight:tab===k?700:500,color:tab===k?"#111":"#6b7280",background:"transparent",border:"none",borderBottom:tab===k?"2px solid #111":"2px solid transparent",cursor:"pointer",marginBottom:-1}}>
            <Icon size={13}/>{l}
          </button>
        ))}
      </div>

      {tab==="quotes"?(
        quotes.length===0
          ?<div style={{textAlign:"center",color:"#9ca3af",padding:"3rem 0",fontSize:14}}>Nenhuma cotação enviada ainda.</div>
          :quotes.map(q=><QuoteCard key={q.id} q={q}/>)
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Rota com CEP */}
          <div style={S.card}>
            <div style={S.sec}><MapPin size={12}/>Rota</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
              <div>
                <p style={{fontSize:13,fontWeight:700,color:"#374151",marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f3f4f6"}}>Origem</p>
                <CepBlock prefix="ori" uf={f.ufOri} setUf={v=>set("ufOri",v)} cidade={f.cidOri} setCidade={v=>set("cidOri",v)} bairro={f.bairroOri} setBairro={v=>set("bairroOri",v)} cep={f.cepOri} setCep={v=>set("cepOri",v)}/>
              </div>
              <div>
                <p style={{fontSize:13,fontWeight:700,color:"#374151",marginBottom:12,paddingBottom:8,borderBottom:"1px solid #f3f4f6"}}>Destino</p>
                <CepBlock prefix="des" uf={f.ufDes} setUf={v=>set("ufDes",v)} cidade={f.cidDes} setCidade={v=>set("cidDes",v)} bairro={f.bairroDes} setBairro={v=>set("bairroDes",v)} cep={f.cepDes} setCep={v=>set("cepDes",v)}/>
              </div>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Carga + Embalagem */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={S.card}>
                <div style={S.sec}><Package size={12}/>Carga</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Field label="Produto / Descrição"><input style={S.input} value={f.produto} onChange={e=>set("produto",e.target.value.toUpperCase())} placeholder="Ex: BQ STD MONTADO"/></Field>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    <Field label="Peso (kg)"><input style={S.input} type="number" min="0" value={f.peso} onChange={e=>set("peso",e.target.value)} placeholder="0"/></Field>
                    <Field label="Volumes"><input style={S.input} type="number" min="0" value={f.vol} onChange={e=>set("vol",e.target.value)} placeholder="0"/></Field>
                    <Field label="Cubagem m³"><input style={S.input} type="number" min="0" step="0.1" value={f.cubagem} onChange={e=>set("cubagem",e.target.value)} placeholder="0"/></Field>
                  </div>
                  <Field label="Valor da Nota Fiscal (R$)"><input style={S.input} value={f.valorNF} onChange={e=>set("valorNF",e.target.value)} placeholder="0,00"/></Field>
                </div>
              </div>

              <div style={S.card}>
                <div style={S.sec}><Package size={12}/>Embalagem &amp; Unitização</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Field label="Tipo de Embalagem">
                    <select style={S.input} value={f.embalagem} onChange={e=>set("embalagem",e.target.value)}>
                      {EMBALAGENS.map(e=><option key={e}>{e}</option>)}
                    </select>
                  </Field>
                  <Field label="Unitização da Carga">
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {UNITIZACOES.map(u=>(
                        <label key={u.value} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 10px",border:`1px solid ${f.unitizacao===u.value?"#111":"#e5e7eb"}`,borderRadius:8,cursor:"pointer",background:f.unitizacao===u.value?"#f9fafb":"#fff"}}>
                          <input type="radio" name="unitizacao" value={u.value} checked={f.unitizacao===u.value} onChange={()=>set("unitizacao",u.value)} style={{marginTop:3,flexShrink:0}}/>
                          <div>
                            <div style={{fontSize:13,fontWeight:600,color:"#111"}}>{u.label}</div>
                            <div style={{fontSize:11,color:"#9ca3af"}}>{u.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>
            </div>

            {/* Cálculo ANTT */}
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={S.card}>
                <div style={S.sec}><Calculator size={12}/>Cálculo ANTT</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <Field label="Tipo de Veículo">
                    <select style={S.input} value={f.veiculo} onChange={e=>set("veiculo",e.target.value)}>
                      {Object.entries(VEI).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
                    </select>
                  </Field>
                  <Field label="Categoria de Carga">
                    <select style={S.input} value={f.categoria} onChange={e=>set("categoria",e.target.value)}>
                      {Object.keys(CAT).map(c=><option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Distância Rodoviária (km)" hint="Use Google Maps ou OSRM para distância real">
                    <input style={S.input} type="number" min="0" value={f.distancia} onChange={e=>set("distancia",e.target.value)} placeholder="0"/>
                  </Field>
                </div>
              </div>

              {min>0?(
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"16px 20px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#15803d",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><ShieldCheck size={12}/>Piso Mínimo ANTT</div>
                  <div style={{fontSize:30,fontWeight:800,color:"#166534",marginBottom:8,letterSpacing:"-0.5px"}}>{fmt(min)}</div>
                  <div style={{fontSize:12,color:"#16a34a",display:"flex",flexDirection:"column",gap:3}}>
                    <div>R$ {VEI[f.veiculo]?.r.toFixed(4)}/km × {f.distancia} km</div>
                    <div>Fator {f.categoria}: ×{CAT[f.categoria].toFixed(2)}</div>
                    {usedFloor&&<div style={{color:"#ca8a04",fontWeight:600,marginTop:2}}>Aplicado mínimo de viagem ({fmt(VEI[f.veiculo]?.m)})</div>}
                  </div>
                </div>
              ):(
                <div style={{background:"#f9fafb",border:"1px dashed #d1d5db",borderRadius:12,padding:"20px",textAlign:"center",color:"#9ca3af",fontSize:13}}>
                  Preencha veículo, categoria e distância para calcular o piso ANTT
                </div>
              )}

              <div style={S.card}>
                <Field label="Valor Sugerido do Frete (R$)"
                  hint={below?`Abaixo do piso ANTT de ${fmt(min)}`:(min>0&&sug>=min?`+${(((sug-min)/min)*100).toFixed(1)}% acima do piso — dentro do limite legal`:undefined)}
                  hintColor={below?"#dc2626":"#16a34a"}>
                  <input style={{...S.input,borderColor:below?"#fca5a5":"#d1d5db",background:below?"#fff5f5":"#fff"}} value={f.valorSugerido} onChange={e=>set("valorSugerido",e.target.value)} placeholder="0,00"/>
                </Field>
                {err&&(
                  <div style={{marginTop:10,display:"flex",alignItems:"flex-start",gap:8,background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#be123c"}}>
                    <AlertTriangle size={14} style={{flexShrink:0,marginTop:1}}/>{err}
                  </div>
                )}
                <button onClick={submit} style={{...S.btn,width:"100%",justifyContent:"center",background:"#111",color:"#fff",marginTop:14,padding:"11px 0",fontSize:14}}>
                  Enviar para Aprovação
                </button>
                <p style={{fontSize:11,color:"#9ca3af",textAlign:"center",marginTop:6}}>Portaria SEAE 71/2022 — Tabela ANTT 2025</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminView({quotes,updateQuote}){
  const [tab,setTab]=useState("pending");
  const pending=quotes.filter(q=>q.status==="Aguardando");
  const approved=quotes.filter(q=>q.status==="Aprovada");
  const rejected=quotes.filter(q=>q.status==="Reprovada");
  const shown=tab==="pending"?pending:quotes;
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[{label:"Total",value:quotes.length,c:"#374151",bg:"#f9fafb",b:"#e5e7eb"},
          {label:"Aguardando",value:pending.length,c:"#92400e",bg:"#fffbeb",b:"#fde68a"},
          {label:"Aprovadas",value:approved.length,c:"#065f46",bg:"#f0fdf4",b:"#bbf7d0"},
          {label:"Reprovadas",value:rejected.length,c:"#991b1b",bg:"#fff5f5",b:"#fecdd3"},
        ].map(s=>(
          <div key={s.label} style={{background:s.bg,border:`1px solid ${s.b}`,borderRadius:10,padding:"12px 16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:s.c,textTransform:"uppercase",letterSpacing:"0.05em",opacity:0.7}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:800,color:s.c,marginTop:2}}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:4,marginBottom:16,borderBottom:"1px solid #e5e7eb"}}>
        {[["pending",`Pendentes (${pending.length})`],["all","Todas"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",fontSize:13,fontWeight:tab===k?700:500,color:tab===k?"#111":"#6b7280",background:"transparent",border:"none",borderBottom:tab===k?"2px solid #111":"2px solid transparent",cursor:"pointer",marginBottom:-1}}>{l}</button>
        ))}
      </div>
      {shown.length===0
        ?<div style={{textAlign:"center",color:"#9ca3af",padding:"3rem 0",fontSize:14}}>{tab==="pending"?"Nenhuma cotação aguardando.":"Nenhuma cotação registrada."}</div>
        :shown.map(q=><QuoteCard key={q.id} q={q} isAdmin onApprove={(id,c)=>updateQuote(id,"Aprovada",c)} onReject={(id,c)=>updateQuote(id,"Reprovada",c)}/>)
      }
    </div>
  );
}

const SEED=[
  {id:1,status:"Aguardando",createdAt:"29/04/2026 09:15",cepOri:"09371-001",ufOri:"SP",cidOri:"MAUÁ",bairroOri:"JARDIM ZAÍRA",cepDes:"20040-020",ufDes:"RJ",cidDes:"RIO DE JANEIRO",bairroDes:"CENTRO",produto:"BQ STD MONTADO",embalagem:"Palete",unitizacao:"paletizada",peso:"3500",vol:"50",cubagem:"12",valorNF:"45.000",veiculo:"Carreta",categoria:"Geral",distancia:"430",valorSugerido:"4850",anttMin:calcMin("Carreta","430","Geral"),adminComment:""},
  {id:2,status:"Aprovada",createdAt:"28/04/2026 14:30",cepOri:"18013-000",ufOri:"SP",cidOri:"SOROCABA",bairroOri:"CENTRO",cepDes:"40010-000",ufDes:"BA",cidDes:"SALVADOR",bairroDes:"COMÉRCIO",produto:"MATERIAL PLÁSTICO",embalagem:"Saco / Big Bag",unitizacao:"granel",peso:"1200",vol:"15",cubagem:"8",valorNF:"28.000",veiculo:"Toco",categoria:"Geral",distancia:"1850",valorSugerido:"5200",anttMin:calcMin("Toco","1850","Geral"),adminComment:"Aprovado. Valor dentro da margem."},
];

export default function App(){
  const [role,setRole]=useState("user");
  const [quotes,setQuotes]=useState(SEED);
  const addQuote=q=>setQuotes(p=>[q,...p]);
  const updateQuote=(id,status,comment)=>setQuotes(p=>p.map(q=>q.id===id?{...q,status,adminComment:comment}:q));
  const pending=quotes.filter(q=>q.status==="Aguardando");
  return(
    <div style={{minHeight:"100vh",background:"#f3f4f6",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"0 32px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,background:"#111",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}><Truck size={16} color="#fff"/></div>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:"#111",lineHeight:1.1}}>FreteANTT</div>
              <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,letterSpacing:"0.04em"}}>PISO MÍNIMO 2025</div>
            </div>
          </div>
          <div style={{display:"flex",background:"#f3f4f6",borderRadius:10,padding:4,gap:4}}>
            {[["user",User,"Cotador"],["admin",Settings,pending.length>0?`Admin (${pending.length})`:"Admin"]].map(([r,Icon,l])=>(
              <button key={r} onClick={()=>setRole(r)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",fontSize:13,fontWeight:600,background:role===r?"#fff":"transparent",color:role===r?"#111":"#6b7280",border:role===r?"1px solid #e5e7eb":"none",borderRadius:7,cursor:"pointer"}}>
                <Icon size={14}/>{l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 32px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          {role==="user"?<><BarChart3 size={18} color="#374151"/><h1 style={{fontSize:18,fontWeight:800,color:"#111",margin:0}}>Nova Cotação de Frete</h1></>:<><Settings size={18} color="#374151"/><h1 style={{fontSize:18,fontWeight:800,color:"#111",margin:0}}>Painel Administrativo</h1></>}
        </div>
        {role==="user"?<UserView quotes={quotes} addQuote={addQuote}/>:<AdminView quotes={quotes} updateQuote={updateQuote}/>}
      </div>
    </div>
  );
}
