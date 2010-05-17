package com.choiceofgames.choicescript;

public class StatChartRow {
	public enum RowType {
		PERCENT, TEXT;
	}
	
	final RowType type;
	final String variableName;
	final String chartLabel;
	
	public StatChartRow(RowType type, String variableName, String chartLabel) {
		this.type = type;
		this.variableName = variableName;
		this.chartLabel = chartLabel;
	}
	
}
