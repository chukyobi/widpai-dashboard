"use server"

import { query } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function updateRatesAction(formData: FormData) {
  try {
    const buyRate = formData.get("buyRate") as string
    const sellRate = formData.get("sellRate") as string

    if (!buyRate || !sellRate) {
      return { success: false, error: "Missing required fields" }
    }

    await query(
      `UPDATE exchange_rates 
       SET buy_rate_per_kes = $1, sell_rate_per_kes = $2, updated_at = NOW()
       WHERE pair = 'KES_NGN'`,
      [parseFloat(buyRate), parseFloat(sellRate)]
    )

    revalidatePath("/rates")
    return { success: true }
  } catch (error) {
    console.error("Error updating rates:", error)
    return { success: false, error: "Failed to update rates" }
  }
}
