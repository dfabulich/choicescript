<?php

class Scope {
  protected $_parent;
  protected $definitions = array();
  protected $assignments = array();

  /**
   * Turns a name symbol into a variable symbol
   *
   * @param Symbol $symbol A name object occurring in the current scope
   */
  public function define(&$symbol) {
    if ($token = $this->definitions[$symbol->value] && $token->reserved) {
      throw new Exception("Already defined: {$symbol->value}");
    }

    $this->definitions[$symbol->value] = $symbol;
    $symbol->reserved = FALSE;
    $symbol->nud = 'nud_itself';
    $symbol->led = NULL;
    $symbol->std = NULL;
    $symbol->lbp = 0;
    $symbol->scope = $this;
    $symbol->global_scope = empty($this->_parent);

    return $symbol;
  }

  /**
   * Mark an assignment made in the current scope between two symbols
   *
   * @param Symbol $to_expression The expression $expression is assigned to
   * @param Symbol $expression The expression being assigned
   */
  public function assignment($to_expression, $expression) {
    if ($to_expression->arity == 'name' || $to_expression->arity == 'literal') {
      $this->assignments[$to_expression->value] = $expression;
    }
  }

  public function assigned($variable) {
    return $this->assignments[$variable];
  }

  /**
   * Sets the current scope's parent
   *
   * @param Scope $parent
   */
  public function setParent($parent) {
    if ($parent instanceof Scope) {
      return ($this->_parent = $parent);
    }
  }

  /**
   * Returns the current parent
   */
  public function parent() {
    // This is how pop() will work as well
    return $this->_parent;
  }

  public function definition($name) {
    return $this->definitions[$name];
  }

  /**
   * Tries to look up through each scope
   * to find a symbol with the same name
   * and returns the global symbol or empty
   * (name) symbol instead
   */
  public function find ($name, $symbol_table) {
    if ($symbol_table[$name]) {
      return clone $symbol_table[$name];
    }

    $scope = $this;
    while (1) {
      if ($symbol = $scope->definition($name)) {
        return clone $symbol;
      }
      if (!$scope->parent()) {
        if (array_key_exists($name, $symbol_table)) {
          return $symbol_table[$name];
        }
        $symbol = $symbol_table['(name)'];
        $s = clone $symbol;
        $s->global_scope = true;
        $s->reserved = false;
        $s->nud = 'nud_itself';
        $s->led = null;
        $s->std = null;
        $s->lbp = 0;
        $s->scope = $scope;
        return $s;
      }
      $scope = $scope->parent();
    }
  }

  /**
   * Marks a variable symbol as being reserved in the current scope
   *
   * @param Symbol @symbol The variable symbol to mark reserved
   */
  public function reserve($symbol) {
    if ($symbol->arity != 'name' || $symbol->reserved) {
      return;
    }

    if ($token = $this->definitions[$symbol->value]) {
      if ($token->reserved) {
        return;
      }
      if ($token->arity == 'name') {
        throw new Exception("Already defined: {$symbol->value}");
      }
    }

    $this->definitions[$symbol->value] = $symbol;
    $symbol->reserved = true;
  }
}