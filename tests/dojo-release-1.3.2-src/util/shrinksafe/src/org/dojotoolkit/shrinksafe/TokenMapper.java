/*
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Rhino code, released
 * May 6, 1999.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1997-1999
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Alex Russell
 *   Richard Backhouse
 */
 
 package org.dojotoolkit.shrinksafe;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import org.mozilla.javascript.ObjArray;
import org.mozilla.javascript.ScriptOrFnNode;
import org.mozilla.javascript.ScriptRuntime;
import org.mozilla.javascript.Token;

public class TokenMapper {
	private ArrayList functionBracePositions = new ArrayList();

	/**
	 * Map of all replaced tokens
	 */
	private ArrayList replacedTokens = new ArrayList();

	/**
	 * Collection of Function nodes
	 */
	private static ObjArray funcObjects = new ObjArray();

	/**
	 * Map of each Function node and all the variables in its current function
	 * scope, other variables found while traversing the prototype chain and
	 * variables found in the top-level scope.
	 */
	private static ArrayList functionVarMappings = new ArrayList();

	public int functionNum = 0;

	private int parentScope = 0;

	private int lastTokenCount = 0;

	/**
	 * Reset the static members for the TokenMapper.
	 */
	public static void reset() {
		funcObjects = new ObjArray();
		functionVarMappings = new ArrayList();
	}

	/**
	 * Generate new compressed tokens
	 * <p>
	 * 
	 * @param token
	 *            value of the string token
	 * @param hasNewMapping
	 *            boolean value indicating a new variable binding
	 * @return compressed token
	 */
	private String getMappedToken(String token, boolean hasNewMapping) {
		String newToken = null;
		HashMap tokens = null;
		String blank = new String("");
		int localScope = functionBracePositions.size() - 1;

		String oldToken = getPreviousTokenMapping(token, hasNewMapping);

		if (!oldToken.equalsIgnoreCase(blank)) {
			return oldToken;
		} else if ((hasNewMapping || isInScopeChain(token))) {
			lastTokenCount++;
			newToken = new String("_" + Integer.toHexString(lastTokenCount));
			if (newToken.length() >= token.length()) {
				newToken = token;
			}
			if (hasNewMapping) {
				tokens = (HashMap) replacedTokens.get(localScope);
			} else {
				tokens = (HashMap) replacedTokens.get(parentScope);
			}

			tokens.put(token, newToken);
			return newToken;
		}
		return token;
	}

	/**
	 * Checks for variable names in prototype chain
	 * <p>
	 * 
	 * @param token
	 *            value of the string token
	 * @return boolean value indicating if the token is present in the chained
	 *         scope
	 */
	private boolean isInScopeChain(String token) {
		int scope = functionBracePositions.size();
		HashMap chainedScopeVars = (HashMap) functionVarMappings
				.get(functionNum);
		if (!chainedScopeVars.isEmpty()) {
			for (int i = scope; i > 0; i--) {
				if (chainedScopeVars.containsKey(new Integer(i))) {
					parentScope = i - 1;
					List temp = Arrays.asList((String[]) chainedScopeVars
							.get(new Integer(i)));
					if (temp.indexOf(token) != -1) {
						return true;
					}
				}
			}
		}
		return false;
	}

	/**
	 * Checks previous token mapping
	 * <p>
	 * 
	 * @param token
	 *            value of the string token
	 * @param hasNewMapping
	 *            boolean value indicating a new variable binding
	 * @return string value of the previous token or blank string
	 */
	private String getPreviousTokenMapping(String token, boolean hasNewMapping) {
		String result = new String("");
		int scope = replacedTokens.size() - 1;

		if (scope < 0) {
			return result;
		}

		if (hasNewMapping) {
			HashMap tokens = (HashMap) (replacedTokens.get(scope));
			if (tokens.containsKey(token)) {
				result = (String) tokens.get(token);
				return result;
			}
		} else {
			for (int i = scope; i > -1; i--) {
				HashMap tokens = (HashMap) (replacedTokens.get(i));
				if (tokens.containsKey(token)) {
					result = (String) tokens.get(token);
					return result;
				}
			}
		}
		return result;
	}

	/**
	 * Generate mappings for each Function node and parameters and variables
	 * names associated with it.
	 * <p>
	 * 
	 * @param parseTree
	 *            Mapping for each function node and corresponding parameters &
	 *            variables names
	 */
	private void collectFunctionMappings(ScriptOrFnNode parseTree) {
		int level = -1;
		collectFuncNodes(parseTree, level, null);
	}

	/**
	 * Recursive method to traverse all Function nodes
	 * <p>
	 * 
	 * @param parseTree
	 *            Mapping for each function node and corresponding parameters &
	 *            variables names
	 * @param level
	 *            scoping level
	 */
	private static void collectFuncNodes(ScriptOrFnNode parseTree, int level, ScriptOrFnNode parent) {
		level++;
		functionVarMappings.add(new HashMap());

		HashMap bindingNames = (HashMap) functionVarMappings
				.get(functionVarMappings.size() - 1);
		bindingNames.put(new Integer(level), parseTree.getParamAndVarNames());
		funcObjects.add(parseTree);

	    if (parent != null) {
	        bindingNames.put(new Integer(level-1), parent.getParamAndVarNames());
	    }
	    
		int nestedCount = parseTree.getFunctionCount();
		for (int i = 0; i != nestedCount; ++i) {
			collectFuncNodes(parseTree.getFunctionNode(i), level, parseTree);
			bindingNames = (HashMap) functionVarMappings.get(functionVarMappings.size() - 1);
			bindingNames.put(new Integer(level), parseTree.getParamAndVarNames());
        }
	}

	/**
	 * Compress the script
	 * <p>
	 * 
	 * @param encodedSource
	 *            encoded source string
	 * @param offset
	 *            position within the encoded source
	 * @param asQuotedString
	 *            boolean value indicating a quoted string
	 * @param sb
	 *            String buffer reference
	 * @param prevToken
	 *            Previous token in encoded source
	 * @param inArgsList
	 *            boolean value indicating position inside arguments list
	 * @param currentLevel
	 *            embeded function level
	 * @param parseTree
	 *            Mapping of each function node and corresponding parameters &
	 *            variables names
	 * @return compressed script
	 */
	public int sourceCompress(String encodedSource, int offset,
			boolean asQuotedString, StringBuffer sb, int prevToken,
			boolean inArgsList, int currentLevel, ScriptOrFnNode parseTree) {

		boolean hasNewMapping = false;

		if (functionVarMappings.isEmpty())
			collectFunctionMappings(parseTree);

		int length = encodedSource.charAt(offset);
		++offset;
		if ((0x8000 & length) != 0) {
			length = ((0x7FFF & length) << 16) | encodedSource.charAt(offset);
			++offset;
		}
		if (sb != null) {
			String str = encodedSource.substring(offset, offset + length);
			String sourceStr = new String(str);
			if ((prevToken == Token.VAR) || (inArgsList)) {
				hasNewMapping = true;
			}
			if (((functionBracePositions.size() > 0) && (currentLevel >= (((Integer) functionBracePositions
					.get(functionBracePositions.size() - 1)).intValue())))
					|| (inArgsList)) {
				if (prevToken != Token.DOT) {
					str = this.getMappedToken(str, hasNewMapping);
				}
			}
			if ((!inArgsList) && (asQuotedString)) {
				if ((prevToken == Token.LC) || (prevToken == Token.COMMA)) {
					str = sourceStr;
				}
			}
			if (!asQuotedString) {
				sb.append(str);
			} else {
				sb.append('"');
				sb.append(ScriptRuntime.escapeString(str));
				sb.append('"');
			}
		}
		return offset + length;
	}

	public void enterNestingLevel(int braceNesting) {
		functionBracePositions.add(new Integer(braceNesting + 1));
		replacedTokens.add(new HashMap());
	}

	public void leaveNestingLevel(int braceNesting) {
		Integer bn = new Integer(braceNesting);

		if ((functionBracePositions.contains(bn))
				&& (replacedTokens.size() > 0)) {
			// remove our mappings now!
			int scopedSize = replacedTokens.size();
			replacedTokens.remove(scopedSize - 1);
			functionBracePositions.remove(bn);
		}
	}
}
