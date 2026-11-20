/**
 * Idiomark Protocol Core
 *
 * Core functionality for extraction, validation, and inference
 */

// Extraction
export {
  IdiomarkExtractor,
  extractFromTextString,
  extractFromTextStrings,
  extractFromPlatforms,
  getSupportedPlatforms,
  isPlatformSupported,
  getAdapterPackage
} from './extractor'

// Validation
export { IdiomarkValidator } from './validator'
export { IdiomarkDValidator, validateIdiomarkD } from './validator-dev'

// Analysis
export { PersonalityAnalyzer, analyzeText, createTextSamples } from './analyzer'
export {
  DeveloperBehaviorAnalyzer,
  analyzeDeveloperBehavior
} from './analyzer-dev'
export type {
  CodeSample,
  BehavioralAnalysisResult
} from './analyzer-dev'

// AST Analysis
export { ASTAnalyzer, analyzeCodeAST } from './ast-analyzer'
export type {
  ASTAnalysisResult,
  ASTCodeMetrics
} from './ast-analyzer'

// Idiomark File Loading (Consumption)
export {
  loadIdiomarkFile,
  loadIdiomarkById,
  listIdiomarkFiles,
  loadAllIdiomarkFiles,
  writeIdiomarkFile,
  deleteIdiomarkFile
} from './loader'
export type { LoadOptions, LoadResult } from './loader'

// Personality Response Generation
export {
  IdiomarkGenerator,
  createGenerator,
  generateResponse
} from './generator'
export type {
  GenerationOptions,
  GenerationResult,
  StreamChunk,
  StreamCallback
} from './generator'

// Idiomark Reader (Main Consumer)
export {
  IdiomarkReader,
  loadReader,
  createReader
} from './reader'
export type { ReaderOptions } from './reader'

// Personality Prompt Building
export {
  buildSystemPrompt,
  buildResponsePrompt,
  buildChatHistoryPrompt
} from './personality-prompt'

// IdiomarkD Behavioral Analysis Prompts
export {
  DEVELOPER_BEHAVIOR_ANALYSIS_SYSTEM,
  buildBehavioralAnalysisPrompt,
  buildCognitiveStylePrompt,
  buildCodeStructurePrompt,
  buildNamingPrompt,
  buildErrorHandlingPrompt,
  buildTestingPrompt,
  buildCodeReviewPrompt
} from './prompts-dev'

// V2 Experimental Personality Types
export type {
  PersonalityV2,
  BigFiveTraits,
  LinguisticMarkers,
  CommunicationStyle,
  CognitivePatterns,
  EmotionalPatterns,
  SocialDynamics
} from './types-v2'

// V2 Enhanced Prompt Building
export {
  buildSystemPromptV2,
  buildResponsePromptV2,
  buildResponsePromptFromIdiomarkFile
} from './personality-prompt'

// IdiomarkD Integration Layer (DevBehavior, CodeTransformation, CommentGenerationOptions
// are exported as part of the value export block above)
export {
  EditorIntegration,
  createIntegration,
  applyCodeStyle,
  generateComment
} from './integration-dev'

// Inference Server
export { IdiomarkInferenceServer } from './inference'

// Types
export { IdiomarkFile, IdiomarkResult } from './types'
export { schema } from './schema'

// Adapter Framework
export * from './adapters'

// Adapter-related types
export type {
  PlatformAdapter,
  NormalizedContent,
  FetchOptions,
  RawContent,
  ExtractionOptions
} from './types'

// Analyzer-related types
export type {
  AnalysisOptions,
  AnalysisResult
} from './analyzer'

// MCL Robot Profile Types
export type {
  IdiomarkRFile,
  RobotPersona,
  RobotVoice,
  RobotPersonalityTraits,
  RobotConstraints,
  RobotCapability,
  RobotMetadata,
  RobotPerformanceMetrics,
  IdiomarkRInput,
  RobotValidationResult,
  HumanRobotMatchScore,
  MatchingFactors,
  MatchRecommendation,
  MatchingRequest,
  MatchingResponse,
  MatchOptions
} from './types-robot'

export {
  validateRobotProfile,
  validateRobotVoice,
  validateRobotTraits
} from './types-robot'

// MCL Matching Functions
export {
  cosineSimilarity,
  jaccardSimilarity,
  voiceToneToVector,
  calculatePersonalitySimilarity,
  calculateCommunicationMatch,
  calculateTaskAlignment,
  calculateDomainOverlap
} from './matching/similarity'

export {
  computeMatchScore,
  findBestMatches,
  validateWeights,
  DEFAULT_WEIGHTS,
  ALGORITHM_VERSION
} from './matching/matcher'

// IdiomarkG Types
export * from './types-idiomarkg'

// IdiomarkG Normalizer
export { IdiomarkGNormalizer, idiomarkgNormalizer } from './idiomarkg-normalizer'
export type { RawPlatformData, AggregatedPlatformData } from './idiomarkg-normalizer'

// IdiomarkF Types (Idiomark Forms)
export * from './types-idiomarkf'

// IdiomarkF Jobs Extension
export * from './types-idiomarkf-jobs'

// Activity Stream Types
export * from './types-activity'

// Activity factory
export * from './activity-factory'

// Activity processor
export * from './activity-processor'

// Crypto Module
export * from './crypto'
