import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B73D67] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#B73D67] text-white shadow-xs hover:bg-[#982F53] active:scale-[0.99]",
        primarySoft:
          "bg-[#FCEEF2] text-[#B73D67] hover:bg-[#F8DDE5] border border-[#F1D3DF]",
        destructive:
          "bg-red-600 text-white shadow-xs hover:bg-red-700",
        outline:
          "border border-[#EEDFE5] bg-white text-[#38262E] hover:bg-[#FCEEF2]/60 hover:border-[#B73D67]",
        secondary:
          "bg-[#F7F4F5] text-[#38262E] hover:bg-[#FCEEF2] border border-[#EEDFE5]",
        ghost:
          "text-[#38262E] hover:bg-[#FCEEF2]/70 hover:text-[#B73D67]",
        link: "text-[#B73D67] underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[40px] px-4 py-2",
        sm: "min-h-[36px] rounded-md px-3 text-xs",
        lg: "min-h-[44px] rounded-lg px-5",
        icon: "h-9 w-9 min-h-[36px] min-w-[36px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
