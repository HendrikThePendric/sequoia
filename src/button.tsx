type ButtonProps = {
    label: string
    numb: number
}

export function Button({ label, numb }: ButtonProps) {
    return (
        <button>
            {label} - {numb}
        </button>
    )
}
