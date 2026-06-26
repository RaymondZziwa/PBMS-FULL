export class CreateClientAccountDto {
  clientId!: number;
}

export class DepositDto {
  accId!: number;
  amount!: number;
  notes?: string;
}
