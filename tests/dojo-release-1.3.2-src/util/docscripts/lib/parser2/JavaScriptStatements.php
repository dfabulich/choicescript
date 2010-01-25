<?php

require_once('JavaScriptFunctionCall.php');
require_once('JavaScriptAssignment.php');

class JavaScriptStatements {
  protected $statements;
  protected $function_calls;
  protected $function_assignments;
  protected $prefixes = array();

  public function __construct($statements) {
    if (!is_array($statements)) {
      $statements = array($statements);
    }
    $this->statements = $statements;
  }

  public function function_calls($global_scope = FALSE, $name = NULL) {
    $calls = $this->function_calls = isset($this->function_calls) ? $this->function_calls : $this->resolve_something('resolve_function_calls');
    if ($name) {
      $names = array_slice(func_get_args(), 1);
      $filtered = array();
      foreach ($names as $name) {
        $filtered = array_merge($filtered, array_filter($calls, create_function('$item', 'return $item->name() == "' . $name . '";')));
      }
      $calls = $filtered;
    }
    if ($global_scope) {
      $calls = array_filter($calls, create_function('$item', 'return $item->is_global();'));
    }
    return $calls;
  }

  private function resolve_function_calls($statement) {
    if ($statement->id == '(' && $statement->arity == 'binary') {
      return new JavaScriptFunctionCall($statement->first, $statement->second);
    }
  }

  public function assignments($global_scope = FALSE) {
    $assignments = $this->function_assignments = isset($this->function_assignments) ? $this->function_assignments : $this->resolve_something('resolve_assignments');
    if ($global_scope) {
      $assignments =  array_filter($assignments, create_function('$item', 'return $item->is_global();'));
    }
    return $assignments;
  }

  private function resolve_assignments($statement) {
    if ($statement->id == '=' && ($statement->first->id == '.' || $statement->first->id == '[' || $statement->arity == 'name')) {
      return new JavaScriptAssignment($statement->first, $statement->second);
    }
  }

  public function prefix($prefix_name) {
    return $this->prefixes[$prefix_name] ? $this->prefixes[$prefix_name] : $this->resolve_something('resolve_prefix', array($prefix_name));
  }

  private function resolve_prefix($statement, $prefix_name) {
    if ($statement->arity == 'statement' && $statement->value == $prefix_name) {
      return $statement;
    }
  }

  private function resolve_something($found_callback, $passed_args = array(), $somethings = array(), $statements = NULL) {
    if (!$statements) {
      $statements = $this->statements;
    }

    if (!is_array($statements)) {
      $statements = array($statements);
    }

    foreach ($statements as $statement) {
      array_unshift($passed_args, $statement);
      if ($something = call_user_func_array(array($this, $found_callback), $passed_args)) {
        $somethings[] = $something;
        continue;
      }
      array_shift($passed_args);

      if ($statement->first) {
        $somethings = $this->resolve_something($found_callback, $passed_args, $somethings, $statement->first);
      }
      if ($statement->second) {
        $somethings = $this->resolve_something($found_callback, $passed_args, $somethings, $statement->second);
      }
      if ($statement->third) {
        $somethings = $this->resolve_something($found_callback, $passed_args, $somethings, $statement->third);
      }
      if ($statement->block) {
        $somethings = $this->resolve_something($found_callback, $passed_args, $somethings, $statement->block);
      }
    }

    return $somethings;
  }
}