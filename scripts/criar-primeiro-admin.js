import "dotenv/config";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const matricula=String(process.env.ADMIN_MATRICULA||"").trim();
const senha=String(process.env.ADMIN_SENHA||"");
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.");
if(!matricula||senha.length<8) throw new Error("Configure ADMIN_MATRICULA e ADMIN_SENHA com no mínimo 8 caracteres.");
const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:empregado,error:erroEmp}=await supabase.from("empregados").select("id,matricula,classificacao").eq("matricula",matricula).maybeSingle();
if(erroEmp) throw erroEmp;
if(!empregado) throw new Error(`Matrícula ${matricula} não encontrada em empregados.`);
if(String(empregado.classificacao||"").trim().toLocaleLowerCase("pt-BR")!=="admin" && String(empregado.classificacao||"").trim().toLocaleLowerCase("pt-BR")!=="administrador") throw new Error("O empregado precisa ter classificacao = admin antes de criar a conta administrativa.");
const salt=crypto.randomBytes(16).toString("hex");
const hash=crypto.scryptSync(senha,salt,64).toString("hex");
const {error}=await supabase.from("usuarios_acesso").upsert({matricula,senha_hash:`${salt}:${hash}`,ativo:true},{onConflict:"matricula"});
if(error) throw error;
console.log(`Conta administrativa criada/atualizada para matrícula ${matricula}. Remova ADMIN_SENHA do ambiente após uso.`);
