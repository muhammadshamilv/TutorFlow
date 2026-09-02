import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = React.ComponentProps<typeof Input>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
    ({ className, ...props }, ref) => {
        const [visible, setVisible] = useState(false);

        return (
            <div className="relative">
                <Input
                    {...props}
                    ref={ref}
                    type={visible ? "text" : "password"}
                    className={cn("pr-10", className)}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setVisible((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={visible ? "Hide password" : "Show password"}
                >
                    {visible ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                    <Eye className="size-4" aria-hidden="true" />
                    )}
                </button>
            </div>
        );
    }
);

PasswordInput.displayName = "PasswordInput";