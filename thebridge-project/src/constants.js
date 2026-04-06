import { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

const REWARDS_DATA = {points:[],free:[],events:[],date:""};
const INIT_DATA = {orders:[],customers:[],monthly:[],online:[],fabrics:[],staff:[]};


const G = {
  bg:"#0D0B09", surface:"#161410", card:"#1E1A16",
  border:"#2E2820", copper:"#C8794A", copperLight:"#E8956A",
  copperGlow:"rgba(200,121,74,0.15)", cream:"#F0E6D6", creamMuted:"#A89880",
  white:"#FFFFFF", green:"#5B9E72", greenBg:"rgba(91,158,114,0.12)",
  red:"#C05A4A", redBg:"rgba(192,90,74,0.12)", yellow:"#C4963A",
  yellowBg:"rgba(196,150,58,0.12)", blue:"#4A7EA8", blueBg:"rgba(74,126,168,0.12)",
  purple:"#8A6AB8",
};
const S = "'Noto Sans KR','Apple SD Gothic Neo',sans-serif";
const SF = "'Noto Serif KR','Apple SD Gothic Neo',serif";
let _n = 100;
const uid = () => `#${String(++_n).padStart(4,"0")}`;
const nowT = () => {
  const d = new Date();
  return { date: d.toLocaleDateString("ko-KR"), time: d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"}) };
};
const baseInp = {
  width:"100%", padding:"10px 13px", borderRadius:10,
  border:`1px solid ${G.border}`, background:G.surface,
  fontFamily:S, fontSize:13, color:G.cream,
  outline:"none", boxSizing:"border-box",
};

const dlXlsx = (wb, filename) => {
  const buf = XLSX.write(wb, {bookType:"xlsx", type:"array"});
  const blob = new Blob([buf], {type:"application/octet-stream"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const sC = s => s==="출고완료" ? [G.green,G.greenBg] : s==="준비중" ? [G.yellow,G.yellowBg] : [G.blue,G.blueBg];
const pC = p => p==="입금완료" ? [G.green,G.greenBg] : [G.red,G.redBg];

const PARSE_SYSTEM = `동대문 원단시장 카카오톡 주문 메시지 분석. 순수 JSON만 반환. 마크다운 없이.
{"customer":"고객명","phone":"전화번호 또는 null","items":[{"fabric":"원단명","color":"색상","qty":숫자}],"payment":"입금완료|미입금","address":"주소 또는 null","note":"메모 또는 null"}
이미지인 경우 화면에서 주문 정보를 직접 읽어서 파싱하세요.`;

async function aiParseText(text, apiKey) {
  if (!apiKey) throw new Error("API 키가 설정되지 않았습니다. 설정 탭에서 Anthropic API 키를 입력해주세요.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": apiKey,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true",
    },
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:1000,
      system:[{type:"text",text:PARSE_SYSTEM}],
      messages:[{role:"user",content:text}],
    }),
  });
  const d = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(d.error?.message || `API 오류 (${res.status})`);
  return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
}

async function aiParseImage(base64, mimeType, apiKey) {
  if (!apiKey) throw new Error("API 키가 설정되지 않았습니다. 설정 탭에서 Anthropic API 키를 입력해주세요.");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": apiKey,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true",
    },
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:1000,
      system:[{type:"text",text:PARSE_SYSTEM}],
      messages:[{role:"user",content:[
        {type:"image",source:{type:"base64",media_type:mimeType,data:base64}},
        {type:"text",text:"이 이미지에서 원단 주문 정보를 추출해서 JSON으로 반환하세요."},
      ]}],
    }),
  });
  const d = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(d.error?.message || `API 오류 (${res.status})`);
  return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
}

// ── atoms ────────────────────────────────────────────────────
export { G, SF, S, REWARDS_DATA, INIT_DATA, baseInp, uid, nowT, dlXlsx, sC, pC, aiParseText, aiParseImage };
