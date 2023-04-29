import {createCookieSessionStorage} from '@remix-run/node'
import {isTheme, Theme} from './theme_provider'

function getRequiredEnvVarFromObj(
    obj: Record<string, string | undefined>,
    key: string,
    devValue: string = `${key}-dev-value`,
) {
    let value = devValue
    const envVal = obj[key]
    if (envVal) {
        value = envVal
    } else if (obj.NODE_ENV === 'production') {
        throw new Error(`${key} is a required env variable`)
    }
    return value
}

function getRequiredServerEnvVar(key: string, devValue?: string) {
    return getRequiredEnvVarFromObj(process.env, key, devValue)
}

const themeStorage = createCookieSessionStorage({
    cookie: {
        name: 'austin_theme',
        secure: true,
        secrets: [getRequiredServerEnvVar('SESSION_SECRET')],
        sameSite: 'lax',
        path: '/',
        httpOnly: true,
    },
})

async function getThemeSession(request: Request) {
    const session = await themeStorage.getSession(request.headers.get('Cookie'))
    return {
        getTheme: () => {
            const themeValue = session.get('theme')
            return isTheme(themeValue) ? themeValue : Theme.DARK
        },
        setTheme: (theme: Theme) => session.set('theme', theme),
        commit: () =>
            themeStorage.commitSession(session, {expires: new Date('2089-05-31')}),
    }
}

export {getThemeSession}