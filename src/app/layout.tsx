import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ToastProvider } from '@/components/common/ToastContext';
import { AppShell } from '@/components/layout/AppShell';
import { TopHeader } from '@/components/layout/TopHeader';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { FloatingActions } from '@/components/layout/FloatingActions';
import { MooneyDataProvider } from '@/hooks/useMooneyData';
import { SelectedMonthProvider } from '@/hooks/useSelectedMonth';
import { AuthProvider } from '@/lib/auth/authContext';

export const metadata: Metadata = {
  title: 'Mooney — Sổ Quản Lý Chi Tiêu',
  description: 'Personal expense management web app. Ứng dụng quản lý tài chính cá nhân calendar-first êm dịu, thông minh và tiện lợi.',
  applicationName: 'Mooney',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mooney',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'Mooney — Sổ Quản Lý Chi Tiêu',
    description: 'Personal expense management web app.',
    siteName: 'Mooney',
    locale: 'vi_VN',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FAF9F5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen font-sans bg-background-subtle text-text-primary antialiased selection:bg-primary-soft selection:text-primary">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <MooneyDataProvider>
                <SelectedMonthProvider>
                  <AppShell>
                    <TopHeader />
                    <div className="flex-1 pb-24 px-4 overflow-y-auto">
                      {children}
                    </div>
                    <FloatingActions />
                    <BottomNavigation />
                  </AppShell>
                </SelectedMonthProvider>
              </MooneyDataProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
