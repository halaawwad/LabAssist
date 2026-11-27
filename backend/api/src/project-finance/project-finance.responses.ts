import { ApiProperty } from "@nestjs/swagger";
export class FinanceBudgetResponse {
  @ApiProperty() currency!: string;
  @ApiProperty() amount!: string;
  @ApiProperty() spent!: string;
  @ApiProperty() remaining!: string;
  @ApiProperty() estimatedKnown!: string;
  @ApiProperty() unpricedItems!: number;
  @ApiProperty() revision!: number;
}
export class FinanceBomResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() quantityRequired!: number;
  @ApiProperty({ type: String, nullable: true }) estimatedUnitPrice!: string | null;
  @ApiProperty() notes!: string;
  @ApiProperty() isNeeded!: boolean;
  @ApiProperty() notNeededReason!: string;
  @ApiProperty() revision!: number;
  @ApiProperty() acquiredQuantity!: number;
  @ApiProperty() missingQuantity!: number;
  @ApiProperty({ enum: ["NEEDED", "PARTIAL", "ACQUIRED", "NOT_NEEDED"] }) supplyStatus!: string;
}
export class ExpenseLineResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, nullable: true }) bomItemId!: string | null;
  @ApiProperty() label!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() total!: string;
}
export class ExpenseResponse {
  @ApiProperty() id!: string;
  @ApiProperty() purchasedOn!: string;
  @ApiProperty() sellerName!: string;
  @ApiProperty({ enum: ["POSTED", "VOIDED"] }) status!: string;
  @ApiProperty() amount!: string;
  @ApiProperty() revision!: number;
  @ApiProperty() createdBy!: string;
  @ApiProperty() voidReason!: string;
  @ApiProperty({ type: String, nullable: true }) receiptFileId!: string | null;
  @ApiProperty({ type: [ExpenseLineResponse] }) lines!: ExpenseLineResponse[];
}
export class ProjectFinanceResponse {
  @ApiProperty() projectId!: string;
  @ApiProperty() readOnly!: boolean;
  @ApiProperty({ type: FinanceBudgetResponse, nullable: true })
  budget!: FinanceBudgetResponse | null;
  @ApiProperty({ type: [FinanceBomResponse] }) bom!: FinanceBomResponse[];
  @ApiProperty({ type: [ExpenseResponse] }) expenses!: ExpenseResponse[];
}
export class FinanceMutationResponse {
  @ApiProperty() id!: string;
  @ApiProperty() revision!: number;
}
export class BudgetRevisionResponse {
  @ApiProperty() revision!: number;
}
export class BomCreatedResponse extends FinanceMutationResponse {
  @ApiProperty({ type: String, nullable: true }) estimatedUnitPrice!: string | null;
}
