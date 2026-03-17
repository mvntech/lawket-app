import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-card rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-border">
            <Image src="/icon-192.png" alt="Logo" width={80} height={80} />
          </div>
          <div className="text-2xl font-bold tracking-tight mb-1 text-foreground">
            <span className='text-foreground'>Law</span>
            <span className="text-primary">ket</span>
          </div>
          <p className="text-muted-foreground text-sm">
            Every Case. Always with you.
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
