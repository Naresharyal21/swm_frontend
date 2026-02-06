import clsx from 'clsx'
import { NepaliDatePicker } from 'nepali-datepicker-reactjs'

/**
 * Nepali (Bikram Sambat) date input.
 *
 * Value is stored as a string (BS) in YYYY-MM-DD format.
 */
export default function NepaliDateInput({
  value,
  onChange,
  className,
  inputClassName,
  options,
  placeholder = 'Select date (BS)',
  disabled,
}) {
  return (
    <div className={clsx('w-full', className)}>
      <NepaliDatePicker
        value={value}
        onChange={onChange}
        disabled={disabled}
        className=""
        inputClassName={clsx(
          'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-400/40',
          inputClassName
        )}
        placeholder={placeholder}
        options={{
          calenderLocale: 'ne',
          valueLocale: 'en',
          ...(options || {}),
        }}
      />
    </div>
  )
}
