package com.choiceofgames.choicescript;

public class StatChartRow {
	public enum RowType {
		PERCENT, TEXT, OPPOSED_PAIR;
	}
	
	private static RowType fromTagName(String name) {
		if ("percent".equals(name)) {
			return RowType.PERCENT;
		} else if ("text".equals(name)) {
			return RowType.TEXT;
		} else if ("opposed-pair".equals(name)) {
			return RowType.OPPOSED_PAIR;
		} else {
			throw new RuntimeException("Invalid row type tag name: " + name);
		}
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
		this.type = fromTagName(typeName);
		this.value = value;
		this.chartLabel = chartLabel;
		this.opposite = opposite;
	}
	
}
