import { useEffect } from 'react'

type ButtonProps = {
    label: string
    numb: number
}

export function Button({ label, numb }: ButtonProps) {
    useEffect(() => {
        console.log(numb)
    }, [numb])
    return <button>{label}</button>
}
