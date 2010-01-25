<?php

require_once('JavaScriptStatements.php');
require_once('JavaScriptArray.php');

class JavaScriptFunctionCall {
  protected $call;
  protected $args;

  protected $resolved_args;
  protected $name;
  protected $global_scope;

  public function __construct($call, $args) {
    $this->call = $call;
    $this->args = $args;
  }

  private function resolve() {
    list ($this->global_scope, $this->name) = $this->call->resolve();
  }

  public function name() {
    if (!isset($this->name)) {
      $this->resolve();
    }
    return $this->name;
  }

  public function is_global () {
    if (!isset($this->global_scope)) {
      $this->resolve();
    }
    return !!$this->global_scope;
  }

  public function type() {
    // TODO: Try to resolve return type
    return 'Object';
  }

  public function arguments() {
    if (isset($this->resolved_args)) {
      return $this->resolved_args;
    }
    return ($this->resolved_args = new JavaScriptArray($this->args));
  }
}