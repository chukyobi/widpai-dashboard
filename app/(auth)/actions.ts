"use server"

import { redirect } from "next/navigation"
import { query } from "@/lib/db"
import bcrypt from "bcryptjs"
import { createSession, deleteSession } from "@/lib/auth"

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const email = (formData.get("email") as string)?.toLowerCase().trim()
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  let user: { id: number; name: string; email: string; password_hash: string; role: string } | null = null
  try {
    const result = await query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = $1 LIMIT 1",
      [email]
    )
    user = result.rows[0] ?? null
  } catch {
    return { error: "Database error. Please try again." }
  }

  if (!user) return { error: "Invalid email or password" }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) return { error: "Invalid email or password" }

  await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role })
  redirect("/rates")
}

export async function signupAction(formData: FormData): Promise<{ error?: string }> {
  const name = formData.get("name") as string
  const email = (formData.get("email") as string)?.toLowerCase().trim()
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    return { error: "All fields are required" }
  }

  try {
    const existing = await query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email])
    if (existing.rows.length > 0) {
      return { error: "User with this email already exists" }
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const result = await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin') RETURNING id, role",
      [name, email, passwordHash]
    )
    
    const user = result.rows[0]
    await createSession({ userId: user.id, name, email, role: user.role })
  } catch (err) {
    console.error('Signup error:', err)
    return { error: "Database error. Please try again." }
  }

  redirect("/rates")
}

export async function logoutAction() {
  await deleteSession()
  redirect("/login")
}
