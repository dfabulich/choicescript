<?php

class Symbol {
  public $id = NULL;
  public $name = NULL;
  public $value = NULL;
  public $first = NULL;
  public $second = NULL;
  public $third = NULL;
  public $lbp = 0;
  public $reserved = FALSE;
  public $global_scope = FALSE;
  public $assignment = FALSE;
  public $arity;
  public $type;
  public $line_number;
  public $char_pos;

  public $nud = 'nud_default';
  public $led = 'led_default';
  public $std = NULL;

  public $bp = 0;

  /**
   * Creates a symbol with a statement denotation function
   * that reads until it finds an opening {
   */
  public function block($parser) {
    $token = $parser->token;
    $parser->advance('{');
    return $token->std($parser);
  }

  public function nud_default($parser) {
    throw new Exception("Syntax error on line {$this->line_number}, character {$this->char_pos} ({$this->id}:'{$this->value}')");
  }

  public function nud_prefix($parser) {
    $this->first = $parser->expression(70);
    return $this;
  }

  public function nud_itself($parser) {
    return $this;
  }

  public function nud_constant($parser) {
    $parser->scope->reserve($this);
    $this->value = $parser->new_symbol($this->id, TRUE)->value;
    $this->arity = 'literal';
    return $this;
  }

  public function led_default($parser, $left) {
    throw new Exception("Unknown operator ({$this->id}:'{$this->value}')");
  }

  public function led_infix($parser, $left) {
    $this->first = $left;
    $this->second = $parser->expression($this->bp);
    return $this;
  }

  public function led_infixr($parser, $left) {
    $this->first = $left;
    $this->second = $parser->expression($this->bp - 1);
    return $this;
  }

  public function led_assignment($parser, $left) {
    if ($left->id != '.' && $left->id != '[' && $left->arity != 'name') {
      throw new Error('Bad lvalue');
    }
    $this->first = $left;
    $this->second = $parser->expression(9);
    $this->assignment = true;
    $this->arity = 'binary';
    return $this;
  }

  public function __call($method, $args) {
    if ($method == 'lbp') {
      if (is_numeric($this->lbp)) {
        return $this->lbp;
      }
      return call_user_func_array(array($this, $this->lbp), $args);
    }
    if ($method == 'nud') {
      return call_user_func_array(array($this, $this->nud), $args);
    }
    if ($method == 'led') {
      return call_user_func_array(array($this, $this->led), $args);
    }
    if ($method == 'std') {
      return call_user_func_array(array($this, $this->std), $args);
    }
  }

  public function __toString() {
    if ($this->id == '(name)' || $this->id == '(literal)') {
      return '(' . substr($this->id, 1, strlen($this->id) - 2) . " {$this->value})";
    }
    $first = is_array($this->first) ? ('[' . implode(', ', $this->first) . ']') : $this->first;
    $second = is_array($this->second) ? ('[' . implode(', ', $this->second) . ']') : $this->second;
    $third = is_array($this->third) ? ('[' . implode(', ', $this->third) . ']') : $this->third;
    $out = array_diff(array($this->id, $first, $second, $third), array(NULL));
    return '(' . implode(' ', $out) . ')';
  }
}