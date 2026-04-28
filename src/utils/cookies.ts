import { parse, serialize } from 'cookie'

export const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null
  const cookies = parse(document.cookie)
  return cookies[name]
}

export const setCookie = (name: string, value: string, days = 30) => {
  if (typeof document === 'undefined') return
  document.cookie = serialize(name, value, {
    path: '/',
    maxAge: days * 24 * 60 * 60,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })
}

export const removeCookie = (name: string) => {
  if (typeof document === 'undefined') return
  document.cookie = serialize(name, '', {
    path: '/',
    maxAge: -1
  })
}
