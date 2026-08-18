import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { theme, type ThemeConfig } from './theme.config'

const ThemeContext = createContext<ThemeConfig>(theme)

export function useTheme(): ThemeConfig {
  return useContext(ThemeContext)
}

// Loaded once at app boot. Everything under the tree reads brand values via
// useTheme() — nothing should import theme.config directly outside this file.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.title = theme.appName
  }, [])

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
