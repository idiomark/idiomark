/**
 * IdiomarkF Jobs Extension
 *
 * Extended profile schema specifically for job applications.
 * Builds on IdiomarkF Core to handle the complexity of employment forms.
 *
 * @module types-idiomarkf-jobs
 * @version 1.0.0
 */

import type {
  IdiomarkFProfile,
  IdiomarkFIdentity,
  IdiomarkFEducation,
  IdiomarkFWorkExperience,
  IdiomarkFSkills,
  IdiomarkFCertification,
  IdiomarkFLanguage
} from './types-idiomarkf'

/**
 * IdiomarkF Jobs Version
 */
export const IdiomarkF_JOBS_VERSION = '1.0.0'

/**
 * Extended work experience for job applications
 * More detailed than base IdiomarkF work history
 */
export interface IdiomarkFJobsWorkExperience extends IdiomarkFWorkExperience {
  /** Company details */
  company_details?: {
    industry?: string
    size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
    location?: string
    public?: boolean
    ticker?: string
  }

  /** Compensation details */
  compensation?: {
    salary?: number
    currency?: string
    period?: 'hourly' | 'monthly' | 'yearly'
    equity?: boolean
    bonus?: boolean
  }

  /** Reporting structure */
  reports_to?: string
  direct_reports?: number

  /** Key metrics/achievements */
  key_metrics?: {
    metric: string
    value: string
    context?: string
  }[]

  /** Technologies/tools used */
  tech_stack?: string[]

  /** Team size */
  team_size?: number

  /** Reason for leaving */
  leaving_reason?: string

  /** Can this employer be contacted? */
  contact_allowed?: boolean
}

/**
 * Extended education for job applications
 */
export interface IdiomarkFJobsEducation extends IdiomarkFEducation {
  /** Related coursework */
  coursework?: string[]

  /** Thesis/capstone */
  thesis?: {
    title: string
    advisor?: string
    abstract?: string
    url?: string
  }

  /** Activities and societies */
  activities?: string[]

  /** Awards/scholarships */
  awards?: string[]

  /** Study abroad */
  study_abroad?: {
    institution: string
    location: string
    duration: string
  }

  /** Relevant projects */
  projects?: {
    name: string
    description: string
    url?: string
  }[]
}

/**
 * Reference for job applications
 */
export interface IdiomarkFJobsReference {
  /** Reference name */
  name: string

  /** Relationship to candidate */
  relationship: string

  /** Company/title */
  company?: string
  title?: string

  /** Contact info */
  email?: string
  phone?: string

  /** How long known */
  known_since?: string

  /** Reference type */
  type?: 'professional' | 'academic' | 'personal'

  /** Permission to contact */
  contact_allowed?: boolean

  /** Last contacted */
  last_contacted?: string
}

/**
 * Portfolio item for creative/tech jobs
 */
export interface IdiomarkFJobsPortfolioItem {
  /** Project name */
  name: string

  /** Description */
  description: string

  /** Type of work */
  type: 'project' | 'case_study' | 'writing' | 'design' | 'code' | 'video' | 'other'

  /** URL to project */
  url?: string

  /** Date completed */
  date?: string

  /** Technologies used */
  technologies?: string[]

  /** Role in project */
  role?: string

  /** Team size */
  team_size?: number

  /** Metrics/outcomes */
  outcomes?: string[]

  /** Featured/highlighted */
  featured?: boolean
}

/**
 * Job search preferences
 */
export interface IdiomarkFJobsSearchPreferences {
  /** Target job titles */
  target_titles?: string[]

  /** Target industries */
  target_industries?: string[]

  /** Target companies */
  target_companies?: string[]

  /** Companies to exclude */
  excluded_companies?: string[]

  /** Location preferences */
  locations?: {
    preferred?: string[]
    open_to?: string[]
    not_interested?: string[]
    remote_only?: boolean
    hybrid_ok?: boolean
    onsite_ok?: boolean
    willing_to_relocate?: boolean
    relocation_preferences?: string[]
  }

  /** Compensation requirements */
  compensation?: {
    minimum?: number
    target?: number
    currency?: string
    period?: 'hourly' | 'monthly' | 'yearly'
    negotiable?: boolean
    equity_required?: boolean
    equity_minimum?: number
  }

  /** Work preferences */
  work_preferences?: {
    employment_types?: ('full-time' | 'part-time' | 'contract' | 'freelance' | 'internship')[]
    schedule?: 'standard' | 'flexible' | 'compressed' | 'async'
    timezone_preference?: string[]
    travel_tolerance?: 'none' | 'occasional' | 'frequent' | 'extensive'
    management_track?: boolean
    individual_contributor?: boolean
  }

  /** Job search status */
  status?: 'actively_looking' | 'open_to_opportunities' | 'not_looking' | 'confidential'

  /** Start date availability */
  availability?: {
    earliest_start?: string
    notice_period_days?: number
    gardening_leave_days?: number
  }

  /** Company size preferences */
  company_size?: ('startup' | 'small' | 'medium' | 'large' | 'enterprise')[]

  /** Culture preferences */
  culture?: {
    values?: string[]
    environment?: 'structured' | 'collaborative' | 'autonomous' | 'fast-paced'
    dress_code?: 'casual' | 'business_casual' | 'formal'
    work_life_balance?: 'very_important' | 'important' | 'somewhat_important' | 'flexible'
  }
}

/**
 * Application tracking
 */
export interface IdiomarkFJobsApplication {
  /** Application ID */
  id: string

  /** Company name */
  company: string

  /** Job title */
  title: string

  /** Job URL */
  url?: string

  /** Application date */
  applied_at: string

  /** Application status */
  status: 'applied' | 'viewed' | 'screening' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn' | 'expired'

  /** Status history */
  status_history?: {
    status: string
    date: string
    notes?: string
  }[]

  /** Source of job posting */
  source?: string

  /** Recruiter contact */
  recruiter?: {
    name?: string
    email?: string
    phone?: string
    linkedin?: string
  }

  /** Interview details */
  interviews?: {
    type: 'phone' | 'video' | 'onsite' | 'technical' | 'panel' | 'final'
    date: string
    duration_minutes?: number
    interviewers?: string[]
    notes?: string
    location?: string
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'
  }[]

  /** Documents submitted */
  documents?: {
    type: 'resume' | 'cover_letter' | 'portfolio' | 'references' | 'other'
    url?: string
    name: string
    submitted_at: string
  }[]

  /** Notes */
  notes?: string

  /** Tags */
  tags?: string[]

  /** Follow-up date */
  follow_up_date?: string
}

/**
 * Complete IdiomarkF Jobs Profile
 * Extends base IdiomarkF with job-specific fields
 */
export interface IdiomarkFJobsProfile {
  /** Schema version */
  version: string

  /** Base IdiomarkF profile reference */
  base_profile_id?: string

  /** Extended work history */
  work_history?: IdiomarkFJobsWorkExperience[]

  /** Extended education */
  education?: IdiomarkFJobsEducation[]

  /** Skills (extended) */
  skills?: IdiomarkFSkills & {
    /** Years of experience per skill */
    experience_years?: Record<string, number>
    /** Proficiency level per skill */
    proficiency?: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>
  }

  /** Certifications */
  certifications?: IdiomarkFCertification[]

  /** Languages */
  languages?: IdiomarkFLanguage[]

  /** References */
  references?: IdiomarkFJobsReference[]

  /** Portfolio */
  portfolio?: IdiomarkFJobsPortfolioItem[]

  /** Job search preferences */
  search_preferences?: IdiomarkFJobsSearchPreferences

  /** Application history */
  applications?: IdiomarkFJobsApplication[]

  /** Cover letter templates */
  cover_letters?: {
    name: string
    template: string
    default?: boolean
  }[]

  /** Resume versions */
  resumes?: {
    name: string
    url: string
    default?: boolean
    created_at: string
    targeted_roles?: string[]
  }[]

  /** Created timestamp */
  created: string

  /** Updated timestamp */
  updated: string
}

/**
 * Job board specific field mappings
 * For common ATS systems and job boards
 */
export const JOB_BOARD_FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  // Greenhouse
  greenhouse: {
    'job_application[name]': 'identity.name.first',
    'job_application[email]': 'identity.email.primary',
    'job_application[phone]': 'identity.phone.primary',
    'job_application[location]': 'identity.location.city',
    'job_application[linkedin_url]': 'professional.profiles.linkedin',
    'job_application[website_url]': 'identity.website',
    'job_application[resume]': 'professional.resume_url'
  },

  // Lever
  lever: {
    'name': 'identity.name.first',
    'email': 'identity.email.primary',
    'phone': 'identity.phone.primary',
    'location': 'identity.location.city',
    'urls[LinkedIn]': 'professional.profiles.linkedin',
    'urls[Portfolio]': 'professional.profiles.portfolio',
    'urls[Github]': 'professional.profiles.github'
  },

  // Workday
  workday: {
    'Candidate_Name': 'identity.name.first',
    'Email_Address': 'identity.email.primary',
    'Phone_Number': 'identity.phone.primary',
    'City': 'identity.location.city',
    'Country': 'identity.location.country',
    'LinkedIn_Profile': 'professional.profiles.linkedin'
  },

  // Indeed
  indeed: {
    'applicant.name': 'identity.name.first',
    'applicant.email': 'identity.email.primary',
    'applicant.phoneNumber': 'identity.phone.primary',
    'applicant.location': 'identity.location.city',
    'applicant.resume': 'professional.resume_url'
  },

  // Hitmarker (gaming)
  hitmarker: {
    'name': 'identity.name.first',
    'email': 'identity.email.primary',
    'portfolio': 'professional.profiles.portfolio',
    'linkedin': 'professional.profiles.linkedin',
    'twitter': 'social.twitter',
    'discord': 'social.discord'
  }
}

/**
 * Gaming job board specific extensions
 */
export const GAMING_JOB_EXTENSIONS = {
  /** Common gaming industry job titles */
  gaming_job_titles: [
    'Game Developer',
    'Game Designer',
    'Level Designer',
    'Game Artist',
    '3D Artist',
    '2D Artist',
    'Concept Artist',
    'Animator',
    'Technical Artist',
    'Game Producer',
    'QA Tester',
    'Community Manager',
    'Game Writer',
    'Narrative Designer',
    'Audio Designer',
    'Sound Designer',
    'Game Programmer',
    'Engine Programmer',
    'AI Programmer',
    'Backend Developer',
    'Frontend Developer',
    'Unity Developer',
    'Unreal Developer',
    'Mobile Game Developer',
    'VR/AR Developer'
  ],

  /** Gaming industry skills */
  gaming_skills: {
    engines: ['Unity', 'Unreal Engine', 'Godot', 'GameMaker', 'Construct', 'CryEngine'],
    languages: ['C++', 'C#', 'Lua', 'Python', 'JavaScript', 'TypeScript', 'GDScript'],
    tools: ['Blender', 'Maya', '3ds Max', 'ZBrush', 'Substance Painter', 'Photoshop', 'Figma'],
    disciplines: ['Game Design', 'Level Design', 'Systems Design', 'Combat Design', 'Economy Design', 'UX Design'],
    platforms: ['PC', 'Console', 'Mobile', 'VR', 'AR', 'Web']
  },

  /** Gaming company categories */
  gaming_company_types: [
    'AAA Studio',
    'Indie Studio',
    'Mobile Games',
    'VR/AR',
    'Esports',
    'Game Publishing',
    'Game Streaming',
    'Game Technology',
    'Gaming Hardware',
    'Gaming Media'
  ]
}

/**
 * Creates a new IdiomarkF Jobs profile
 */
export function createIdiomarkFJobsProfile(baseProfile?: IdiomarkFProfile): IdiomarkFJobsProfile {
  const now = new Date().toISOString()

  return {
    version: IdiomarkF_JOBS_VERSION,
    base_profile_id: baseProfile?.id,
    work_history: baseProfile?.professional?.work_history?.map(w => ({
      ...w
    })) as IdiomarkFJobsWorkExperience[] | undefined,
    education: baseProfile?.professional?.education?.map(e => ({
      ...e
    })) as IdiomarkFJobsEducation[] | undefined,
    skills: baseProfile?.professional?.skills as IdiomarkFJobsProfile['skills'],
    certifications: baseProfile?.professional?.certifications,
    languages: baseProfile?.professional?.languages,
    references: [],
    portfolio: [],
    search_preferences: undefined,
    applications: [],
    cover_letters: [],
    resumes: baseProfile?.professional?.resume_url ? [{
      name: 'Default Resume',
      url: baseProfile.professional.resume_url,
      default: true,
      created_at: now
    }] : [],
    created: now,
    updated: now
  }
}

/**
 * Adds an application to the tracking
 */
export function trackApplication(
  profile: IdiomarkFJobsProfile,
  application: Omit<IdiomarkFJobsApplication, 'id' | 'applied_at' | 'status_history'>
): IdiomarkFJobsProfile {
  const newApplication: IdiomarkFJobsApplication = {
    ...application,
    id: `app_${Date.now().toString(36)}`,
    applied_at: new Date().toISOString(),
    status: 'applied',
    status_history: [{
      status: 'applied',
      date: new Date().toISOString()
    }]
  }

  return {
    ...profile,
    applications: [...(profile.applications || []), newApplication],
    updated: new Date().toISOString()
  }
}

/**
 * Updates application status
 */
export function updateApplicationStatus(
  profile: IdiomarkFJobsProfile,
  applicationId: string,
  status: IdiomarkFJobsApplication['status'],
  notes?: string
): IdiomarkFJobsProfile {
  const applications = profile.applications?.map(app => {
    if (app.id !== applicationId) return app

    return {
      ...app,
      status,
      status_history: [
        ...(app.status_history || []),
        {
          status,
          date: new Date().toISOString(),
          notes
        }
      ]
    }
  })

  return {
    ...profile,
    applications,
    updated: new Date().toISOString()
  }
}
