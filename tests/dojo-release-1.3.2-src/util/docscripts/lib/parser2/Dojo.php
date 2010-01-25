<?php

require_once('JavaScriptStatements.php');
require_once('JavaScriptFunction.php');
require_once('DojoCommentBlock.php');

class Dojo {
  public static function roll_out($object, $name, &$output) {
    if ($type = $object->type()) {
      $output[$name]['type'] = $type;
    }

    $keys = array('summary', 'description', 'returns', 'tags', 'exceptions');

    if ($object instanceof JavaScriptFunction) {
      $comments = new DojoCommentBlock($object->comments(), $keys, array('example'));

      foreach ($object->parameters() as $parameter) {
        $comments->add_key($parameter->name);

        $output[$name]['parameters'][$parameter->name]['name'] = $parameters->name;

        $type = '';
        if (!empty($parameter->comments)) {
          $type = preg_replace('%(^/\*\s*|\s*\*/$)%', '', $parameter->comments[0]);
        }

        self::type_modifiers($type, $output[$name]['parameters'][$parameter->name]);
      }

      $returns = empty($output[$name]['returns']) ? array() : explode('|', $output[$name]['returns']);
      $body = new JavaScriptStatements($object->body());
      foreach ($body->prefix('return') as $return) {
        if (($pos = strrpos($return->line, '//')) !== false) {
          $returns = array_merge($returns, preg_split('%\s*\|\s*%', trim(substr($return->line, $pos + 2))));
        }
      }
      if (!empty($returns)) {
        $output[$name]['returns'] = implode('|', array_unique($returns));
      }

      foreach ($comments->all() as $key => $text) {
        if ($key == 'example') {
          $output[$name]['examples'] = $text;
        }
        elseif ($key == 'returns') {
          $output[$name]['return_summary'] = $text;
        }
        elseif (in_array($key, $keys)) {
          $output[$name][$key] = ($key == 'summary') ? self::format_summary($text) : $text;
        }
        elseif (!empty($output[$name]['parameters']) && array_key_exists($key, $output[$name]['parameters'])) {
          list($type, $summary) = preg_split('%\s+%', $text, 2);
          if ($type) {
            self::type_modifiers($type, $output[$name]['parameters'][$key]);

            // TODO: tags

            if ($type != $output[$name]['parameters'][$key]['type']) {
              $summary = "$type $summary";
            }
            else {
              $output[$name]['parameters'][$key]['type'] = $type;
            }
          }
          if (!empty($summary)) {
            $output[$name]['parameters'][$key]['summary'] = self::format_summary($summary);
          }
        }
      }
    }
  }

  private static function type_modifiers(&$type, &$on) {
    if(strpos($type, '?')){
      $type = str_replace('?', '', $type);
      $on['optional'] = true;
    }
    if(strpos($type, '...')){
      $type = str_replace('...', '', $type);
      $on['repeating'] = true;
    }
    if (!empty($type)) {
      $on['type'] = $type;
    }
  }

  private static function format_summary($summary) {
    return preg_replace('%`([^`]+)`%', '<code>$1</code>', $summary);
  }
}