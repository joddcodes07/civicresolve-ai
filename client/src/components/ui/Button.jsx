import { Link } from 'react-router-dom'

const VARIANTS = {
  default: '',
  solid: 'btn-solid',
  saffron: 'btn-saffron',
  blue: 'btn-blue',
  green: 'btn-green',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
}

const SIZES = { md: '', sm: 'btn-sm', lg: 'btn-lg' }

export function Button({
  variant = 'default',
  size = 'md',
  block = false,
  to,
  className = '',
  icon,
  iconRight,
  children,
  ...rest
}) {
  const cls = ['btn', VARIANTS[variant] ?? '', SIZES[size] ?? '', block ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ')

  const inner = (
    <>
      {icon}
      <span>{children}</span>
      {iconRight}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {inner}
      </Link>
    )
  }
  return (
    <button className={cls} {...rest}>
      {inner}
    </button>
  )
}

export default Button
