# Copyright (c) 2018 Charles University, Faculty of Arts,
#                    Institute of the Czech National Corpus
# Copyright (c) 2018 Tomas Machalek <tomas.machalek@gmail.com>
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; version 2
# dated June, 1991.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

import re
from functools import wraps
from . import Attribute, PosAttribute, Struct, SimpleAttr, RegistryConf


DEBUG = 0


class RegistrySyntaxError(Exception):
    pass


def watchable(f):

    @wraps(f)
    def fn(slf, token, obj):
        if DEBUG:
            print(('fn: {0}, tok: {1}, curr: {2}'.format(f.__name__, token if len(token) > 0 else '',
                                                         obj.__class__.__name__ if obj else None)))
        return f(slf, token, obj)
    return fn


class Parser:

    def __init__(self, corpus_id, variant, tokens, backend):
        self._tokens = tokens
        self._items = RegistryConf(corpus_id, variant, backend)
        self._posattr_idx = 0

    @staticmethod
    def is_key(s):
        return re.match(r'[A-Z]+', s)

    @staticmethod
    def is_value(s):
        return s != '{' and s != '}' and s != '#'

    @watchable
    def state_0(self, token, obj):
        if token == '$':
            return self.state_0, obj
        elif token.startswith('#'):
            return self.state_3, obj
        elif self.is_key(token):
            if obj:
                self._items.add_item(obj)
            if token == 'ATTRIBUTE':
                attr = PosAttribute(position=self._posattr_idx, name=token)
                self._posattr_idx += 1
                return self.state_1, attr
            elif token == 'STRUCTURE':
                return self.state_1, Struct(token)
            else:
                return self.state_1, SimpleAttr(token)
        else:
            raise RegistrySyntaxError('in state 0 cannot process: {0}'.format(token))

    @watchable
    def state_1(self, token, obj):
        if self.is_value(token):
            if isinstance(obj, SimpleAttr):
                obj.value = token
            else:
                obj.name = token
            return self.state_2, obj
        else:
            raise RegistrySyntaxError('in state 1 cannot process: {0}'.format(token))

    @watchable
    def state_2(self, token, obj):
        if token == '$':
            return self.state_0, obj
        elif token == '{':
            return self.state_4, obj

    @watchable
    def state_3(self, token, obj):
        if token == '$':
            return self.state_0, obj
        return self.state_3, obj

    def state_3b(self, token, obj):
        if token == '$':
            return self.state_4, obj
        return self.state_3b, obj

    def state_3c(self, token, obj):
        if token == '$':
            return self.state_7, obj
        return self.state_3c, obj

    @watchable
    def state_4(self, token, obj):
        if token == '}':
            return self.state_0, obj
        elif self.is_key(token):
            if token == 'ATTRIBUTE':
                obj.new_item(Attribute())
            else:
                obj.new_item(SimpleAttr(token))
            return self.state_5, obj
        elif token == '$':
            return self.state_4, obj
        elif token.startswith('#'):
            return self.state_3b, obj

    @watchable
    def state_5(self, token, obj):
        if self.is_value(token):
            if isinstance(obj.last_item, Attribute):
                obj.last_item.name = token
            else:
                obj.last_item.value = token
            return self.state_6, obj

    @watchable
    def state_6(self, token, obj):
        if token == '$':
            return self.state_4, obj
        elif token == '{':
            return self.state_7, obj

    @watchable
    def state_7(self, token, obj):
        if self.is_key(token):
            obj.last_item.new_item(SimpleAttr(token))
            return self.state_8, obj
        elif token == '$':
            return self.state_7, obj
        elif token == '}':
            return self.state_4, obj
        elif token.startswith('#'):
            return self.state_3c, obj

    @watchable
    def state_8(self, token, obj):
        if self.is_value(token):
            obj.last_item.last_item.value = token
            return self.state_9, obj

    @watchable
    def state_9(self, token, obj):
        if token == '$':
            return self.state_7, obj

    def __call__(self):
        i = 0
        fn = self.state_0
        obj = None
        while fn is not None and i < len(self._tokens):
            fn, obj = fn(self._tokens[i], obj)
            i += 1
        if obj:
            self._items.add_item(obj)
        return self._items
