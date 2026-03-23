export type ParsedOrderRow = {
  rowNumber: number
  account: string
  customerName: string
  width: number | null
  drop: number | null
  material: string
  finish: string
  componentryColour: string
  chainType: string
  operationRaw: string
  qty: number
}

export type PreviewComponent = {
  sourceRow: number
  category: "Finish" | "Winder" | "Pin" | "Chain"
  itemName: string
  quantity: number
}

export function isSwivelOperation(operationRaw: string) {
  return operationRaw.toUpperCase().includes("SWIVEL")
}

export function buildWinderName(componentryColour: string, operationRaw: string) {
  const colour = componentryColour.trim().toUpperCase()

  if (!colour) return ""

  if (isSwivelOperation(operationRaw)) {
    return `${colour} WINDER`
  }

  return `${colour} WINDER`
}

export function buildPinName(componentryColour: string) {
  const colour = componentryColour.trim().toUpperCase()

  if (!colour) return ""

  // current rule:
  // swivel pin does not exist separately
  // pin follows colour only
  return `${colour} PIN`
}

export function buildFinishName(finish: string) {
  return finish.trim().toUpperCase()
}

export function buildChainName(chainType: string) {
  return chainType.trim().toUpperCase()
}

export function mapOrderRowToComponents(row: ParsedOrderRow): PreviewComponent[] {
  const components: PreviewComponent[] = []
  const qty = row.qty > 0 ? row.qty : 1

  const finishName = buildFinishName(row.finish)
  if (finishName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Finish",
      itemName: finishName,
      quantity: qty,
    })
  }

  const chainName = buildChainName(row.chainType)
  if (chainName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Chain",
      itemName: chainName,
      quantity: qty,
    })
  }

  const winderName = buildWinderName(row.componentryColour, row.operationRaw)
  if (winderName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Winder",
      itemName: winderName,
      quantity: qty,
    })
  }

  const pinName = buildPinName(row.componentryColour)
  if (pinName) {
    components.push({
      sourceRow: row.rowNumber,
      category: "Pin",
      itemName: pinName,
      quantity: qty,
    })
  }

  return components
}