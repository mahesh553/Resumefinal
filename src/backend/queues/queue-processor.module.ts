import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

// Entities
import { JdMatching } from "../database/entities/jd-matching.entity";
import { ResumeVersion } from "../database/entities/resume-version.entity";
import { Resume } from "../database/entities/resume.entity";

// Services
import { AIModule } from "../modules/ai/ai.module";
import { FileParserService } from "../modules/resume-analysis/services/file-parser.service";
import { QueueModule } from "./queue.module";

// Processors
import { BulkAnalysisProcessor } from "./processors/bulk-analysis.processor";
import { JDMatchingProcessor } from "./processors/jd-matching.processor";
import { ResumeAnalysisProcessor } from "./processors/resume-analysis.processor";

@Module({
  imports: [
    TypeOrmModule.forFeature([Resume, ResumeVersion, JdMatching]),
    AIModule,
    QueueModule, // Import QueueModule instead of registering queues directly
  ],
  providers: [
    // Processors
    ResumeAnalysisProcessor,
    BulkAnalysisProcessor,
    JDMatchingProcessor,

    // Services (import FileParserService locally since it's not in a module)
    FileParserService,
  ],
  exports: [
    // Export QueueModule so other modules can use it
    QueueModule,
  ],
})
export class QueueProcessorModule {}
