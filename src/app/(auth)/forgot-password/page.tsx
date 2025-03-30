// "use client";
//
// import { useState } from "react";
//
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Loader2 } from "lucide-react";
// import { useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { z } from "zod";
//
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
// import { forgotPasswordSchema } from "@/drizzle/schema/auth/signin-signup-schema";
// import { authClient } from "@/lib/auth-client";
//
// export default function ForgotPassword() {
//   const [isPending, setIsPending] = useState(false);
//
//   const form = useForm<z.infer<typeof forgotPasswordSchema>>({
//     resolver: zodResolver(forgotPasswordSchema),
//     defaultValues: {
//       email: "",
//     },
//   });
//
//   const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
//     setIsPending(true);
//     const { error } = await authClient.forgetPassword({
//       email: data.email,
//       redirectTo: "/reset-password",
//     });
//
//     if (error) {
//       toast.error("Error", { description: error.message });
//     } else {
//       toast.success("Success", {
//         description:
//           "If an account exists with this email, you will receive a password reset link.",
//       });
//     }
//     setIsPending(false);
//   };
//
//   return (
//     <div className="flex grow items-center justify-center p-4">
//       <Card className="w-full max-w-md">
//         <CardHeader>
//           <CardTitle className="text-center text-3xl font-bold text-gray-800">
//             Forgot Password
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <Form {...form}>
//             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
//               <FormField
//                 control={form.control}
//                 name="email"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Email</FormLabel>
//                     <FormControl>
//                       <Input
//                         type="email"
//                         placeholder="Enter your email"
//                         {...field}
//                         autoComplete="email"
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//               <Button disabled={isPending}>
//                 {isPending ? (
//                   <>
//                     <Loader2 className="mr-2 size-4 animate-spin" />
//                     Creating Account...
//                   </>
//                 ) : (
//                   "Sign Up"
//                 )}
//               </Button>
//             </form>
//           </Form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
import React from "react";

const Page = () => {
  return <div>Page</div>;
};
export default Page;
