package com.choiceofgames.choicescript;

import java.util.Collections;
import java.util.List;

public class OptionDisplayGroup {
	final String groupName;
	final List<String> optionTitles;
	public OptionDisplayGroup(String groupName, List<String> optionTitles) {
		this.groupName = groupName;
		this.optionTitles = Collections.unmodifiableList(optionTitles);
	}
	
	
	public String getGroupName() {
		return groupName;
	}
	public List<String> getOptionTitles() {
		return optionTitles;
	}
	
	
}
