package com.choiceofgames.choicescript;

public class StatChartRow {
	public enum RowType {
		PERCENT, TEXT, OPPOSED_PAIR;
	}
	
	public static class Label {
		final String label, definition;
		
		public Label(String label, String definition) {
			this.label = label;
			this.definition = definition;
		}
		
	}
	
	final RowType type;
	final String value;
	final Label chartLabel;
	final Label opposite;
	
	public StatChartRow(String typeName, String value, Label chartLabel) {
		this(typeName, value, chartLabel, null);
	}
	
	public StatChartRow(String typeName, String value, Label chartLabel, Label opposite) {
		this.type = RowType.valueOf(typeName);
		this.value = value;
		this.chartLabel = chartLabel;
		this.opposite = opposite;
	}
	
}
