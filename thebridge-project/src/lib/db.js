import { supabase } from "./supabase.js";

// ── helpers: snake_case <-> camelCase ─────────────────────────
const toCamel = (row) => ({
  id: row.id,
  date: row.date,
  time: row.time,
  customer: row.customer,
  phone: row.phone,
  items: row.items || [],
  payment: row.payment,
  address: row.address,
  note: row.note,
  status: row.status,
  manager: row.manager,
});

const toLogCamel = (row) => ({
  id: row.id,
  date: row.date,
  time: row.time,
  type: row.type,
  itemNo: row.item_no,
  fabric: row.fabric,
  color: row.color,
  qty: row.qty,
  costPrice: row.cost_price,
  ref: row.ref,
  note: row.note,
});

const toCustCamel = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  address: row.address,
  totalOrders: row.total_orders,
  lastOrder: row.last_order,
  note: row.note,
});

// ── Orders ────────────────────────────────────────────────────
export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(toCamel);
}

export async function upsertOrder(order) {
  const { error } = await supabase.from("orders").upsert({
    id: order.id,
    date: order.date,
    time: order.time,
    customer: order.customer,
    phone: order.phone || null,
    items: order.items || [],
    payment: order.payment || "미입금",
    address: order.address || null,
    note: order.note || null,
    status: order.status || "접수",
    manager: order.manager || "",
  });
  if (error) throw error;
}

export async function deleteOrder(id) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}

// ── Inventory ─────────────────────────────────────────────────
export async function fetchInventory() {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("id");
  if (error) throw error;
  return data || [];
}

export async function upsertInventoryItem(item) {
  if (item.id) {
    // 기존 레코드 업데이트
    const { error } = await supabase.from("inventory")
      .update({ fabric: item.fabric, color: item.color || "", stock: item.stock })
      .eq("id", item.id);
    if (error) throw error;
  } else {
    // 신규 추가 (id는 DB가 생성)
    const { error } = await supabase.from("inventory").insert({
      fabric: item.fabric,
      color: item.color || "",
      stock: item.stock,
    });
    if (error) throw error;
  }
}

export async function deleteInventoryItem(id) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
}

// ── Customers ─────────────────────────────────────────────────
export async function fetchCustomers() {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("id");
  if (error) throw error;
  return (data || []).map(toCustCamel);
}

export async function upsertCustomer(c) {
  const payload = {
    name: c.name,
    phone: c.phone || "",
    address: c.address || "",
    total_orders: c.totalOrders || 0,
    last_order: c.lastOrder || null,
    note: c.note || "",
  };
  let data, error;
  if (c.id && typeof c.id === "number") {
    // 기존 고객 업데이트
    ({ data, error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", c.id)
      .select());
  } else {
    // 신규 고객 추가
    ({ data, error } = await supabase
      .from("customers")
      .insert(payload)
      .select());
  }
  if (error) throw error;
  return data?.[0] ? toCustCamel(data[0]) : null;
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

// ── Logs ──────────────────────────────────────────────────────
export async function fetchLogs() {
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(toLogCamel);
}

export async function insertLog(log) {
  const { error } = await supabase.from("logs").insert({
    id: log.id?.toString() || String(Date.now() + Math.random()),
    date: log.date,
    time: log.time,
    type: log.type,
    item_no: log.itemNo || "",
    fabric: log.fabric,
    color: log.color || "",
    qty: log.qty || 0,
    cost_price: log.costPrice || 0,
    ref: log.ref || "",
    note: log.note || "",
  });
  if (error) throw error;
}

export async function deleteLog(id) {
  const { error } = await supabase.from("logs").delete().eq("id", id);
  if (error) throw error;
}

// ── Managers ──────────────────────────────────────────────────
export async function fetchManagers() {
  const { data, error } = await supabase
    .from("managers")
    .select("*")
    .order("id");
  if (error) throw error;
  return (data || []).map((m) => m.name);
}

export async function addManager(name) {
  const { error } = await supabase.from("managers").insert({ name });
  if (error && error.code !== "23505") throw error; // ignore duplicate
}

export async function removeManager(name) {
  const { error } = await supabase.from("managers").delete().eq("name", name);
  if (error) throw error;
}

// ── Bulk: clear all data ──────────────────────────────────────
export async function clearAllData() {
  await supabase.from("orders").delete().neq("id", "");
  await supabase.from("logs").delete().neq("id", "");
  await supabase.from("customers").delete().gt("id", 0);
  // inventory & managers: keep defaults
}
