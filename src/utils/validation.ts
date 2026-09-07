/**
 * Authentication and Form Data Validation Utilities
 */

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number; // 0 - 4
  label: string;
  color: string; // Tailwind color class / hex
  barColor: string;
  requirements: PasswordRequirement[];
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Validates an email address.
 * Returns an error string if invalid, or null if valid.
 */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email address is required.';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address (e.g., hero@comicvault.com).';
  }
  if (trimmed.length > 254) {
    return 'Email address is too long (maximum 254 characters).';
  }
  return null;
}

/**
 * Validates a username.
 * Returns an error string if invalid, or null if valid.
 */
export function validateUsername(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return 'Username is required.';
  }
  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters long.';
  }
  if (trimmed.length > 50) {
    return 'Username must be at most 50 characters long.';
  }
  if (!USERNAME_REGEX.test(trimmed)) {
    return 'Username can only contain letters, numbers, underscores (_), and hyphens (-).';
  }
  return null;
}

/**
 * Validates password input.
 * Returns an error string if invalid, or null if valid.
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  if (password.length > 128) {
    return 'Password must be at most 128 characters long.';
  }
  return null;
}

/**
 * Validates password confirmation.
 * Returns an error string if invalid, or null if valid.
 */
export function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}

/**
 * Computes password strength and checklist evaluation.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements: PasswordRequirement[] = [
    {
      id: 'min_length',
      label: 'At least 6 characters',
      met: password.length >= 6,
    },
    {
      id: 'has_number',
      label: 'Contains a number (0-9)',
      met: /\d/.test(password),
    },
    {
      id: 'has_letter_case',
      label: 'Uppercase & lowercase letters',
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      id: 'has_special',
      label: 'Special character (!@#$%^&*)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  if (!password) {
    return {
      score: 0,
      label: 'Too short',
      color: 'text-text-muted',
      barColor: 'bg-[#262634]',
      requirements,
    };
  }

  let metCount = 0;
  if (password.length >= 6) metCount += 1;
  if (password.length >= 10) metCount += 1;
  if (/\d/.test(password)) metCount += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) metCount += 1;
  if (/[^A-Za-z0-9]/.test(password)) metCount += 1;

  if (password.length < 6) {
    return {
      score: 1,
      label: 'Too short (min. 6)',
      color: 'text-red-400',
      barColor: 'bg-red-500',
      requirements,
    };
  }

  if (metCount <= 2) {
    return {
      score: 2,
      label: 'Weak',
      color: 'text-orange-400',
      barColor: 'bg-orange-500',
      requirements,
    };
  }

  if (metCount <= 3) {
    return {
      score: 3,
      label: 'Good',
      color: 'text-[#ffd23f]',
      barColor: 'bg-[#ffd23f]',
      requirements,
    };
  }

  return {
    score: 4,
    label: 'Heroic Strength! ⚡',
    color: 'text-emerald-400',
    barColor: 'bg-emerald-400',
    requirements,
  };
}
