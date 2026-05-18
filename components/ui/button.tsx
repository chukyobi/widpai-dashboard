import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = "button"
    
    // Simulate cva logic for simplicity
    let variantClasses = "bg-primary text-primary-foreground hover:bg-primary/90"
    if (variant === "destructive") variantClasses = "bg-destructive text-destructive-foreground hover:bg-destructive/90"
    if (variant === "outline") variantClasses = "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
    if (variant === "secondary") variantClasses = "bg-secondary text-secondary-foreground hover:bg-secondary/80"
    if (variant === "ghost") variantClasses = "hover:bg-accent hover:text-accent-foreground"
    if (variant === "link") variantClasses = "text-primary underline-offset-4 hover:underline"

    let sizeClasses = "h-10 px-4 py-2"
    if (size === "sm") sizeClasses = "h-9 rounded-md px-3"
    if (size === "lg") sizeClasses = "h-11 rounded-md px-8"
    if (size === "icon") sizeClasses = "h-10 w-10"

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantClasses,
          sizeClasses,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
