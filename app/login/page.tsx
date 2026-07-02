'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Eye, EyeOff, Zap } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

type LoginForm = z.infer<typeof loginSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    try {
      await login(data)
      router.replace('/')
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setServerError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
      } else {
        setServerError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Header band */}
      <div className="flex-shrink-0 px-6 pt-14 pb-10 text-center">
        {/* Logo mark */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-pea-600 shadow-lg mb-5">
          <Zap className="w-8 h-8 text-white" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Smart Cover Connect</h1>
        <p className="text-white/50 text-sm mt-1">ระบบจัดการฉนวนครอบสายไฟ</p>
        <p className="text-white/30 text-xs mt-0.5">การไฟฟ้าส่วนภูมิภาค</p>
      </div>

      {/* Form card */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white rounded-t-3xl flex-1 px-6 pt-8 pb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-6">เข้าสู่ระบบ</h2>

          {/* Server error */}
          {serverError && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="ชื่อผู้ใช้"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              error={errors.username?.message}
              required
              {...register('username')}
            />

            <div className="flex flex-col gap-1">
              <label
                htmlFor="password-input"
                className="text-sm font-medium text-gray-700"
              >
                รหัสผ่าน
                <span className="text-red-500 ml-0.5" aria-hidden>*</span>
              </label>
              <div className="relative">
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : undefined}
                  className={[
                    'w-full h-12 px-3 pr-12 rounded-xl border text-base',
                    'bg-white text-gray-900 placeholder:text-gray-400',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-pea-500 focus:border-pea-500',
                    errors.password
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 hover:border-gray-400',
                  ].join(' ')}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" aria-hidden />
                  ) : (
                    <Eye className="w-5 h-5" aria-hidden />
                  )}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={isSubmitting}
              className="mt-2"
            >
              เข้าสู่ระบบ
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            ติดต่อผู้ดูแลระบบหากไม่สามารถเข้าสู่ระบบได้
          </p>
        </div>
      </div>
    </div>
  )
}
