import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const MenuContext = createContext({ override: null, setOverride: () => {} })

// the floating menu normally follows the route; a page that has its own actions (like the reading room's tabs)
// can take over the menu while it is on screen with useMenuOverride({ title, items }, deps)
export function MenuProvider({ children }) {
  const [override, setOverride] = useState(null)
  const value = useMemo(() => ({ override, setOverride }), [override])
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

export const useMenu = () => useContext(MenuContext)

export function useMenuOverride(build, deps) {
  const { setOverride } = useContext(MenuContext)
  useEffect(() => {
    setOverride(build())
    return () => setOverride(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
